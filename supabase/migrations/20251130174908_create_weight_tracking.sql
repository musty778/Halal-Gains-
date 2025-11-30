-- Create table for tracking client weight measurements
-- This allows clients to track their weight progress over time

CREATE TABLE IF NOT EXISTS client_weight_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL,
  workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  weight_kg DECIMAL(5, 2) NOT NULL,
  weight_lost_kg DECIMAL(5, 2),
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_user_id, workout_plan_id, week_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weight_tracking_client
  ON client_weight_tracking(client_user_id, workout_plan_id);

CREATE INDEX IF NOT EXISTS idx_weight_tracking_week
  ON client_weight_tracking(workout_plan_id, week_number);

-- Enable RLS
ALTER TABLE client_weight_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own weight tracking" ON client_weight_tracking;
DROP POLICY IF EXISTS "Users can insert own weight tracking" ON client_weight_tracking;
DROP POLICY IF EXISTS "Users can update own weight tracking" ON client_weight_tracking;

-- Policy: Users can view their own weight tracking
CREATE POLICY "Users can view own weight tracking"
  ON client_weight_tracking
  FOR SELECT
  USING (auth.uid() = client_user_id);

-- Policy: Users can insert their own weight tracking
CREATE POLICY "Users can insert own weight tracking"
  ON client_weight_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

-- Policy: Users can update their own weight tracking
CREATE POLICY "Users can update own weight tracking"
  ON client_weight_tracking
  FOR UPDATE
  USING (auth.uid() = client_user_id);

-- Function to record weekly weight
CREATE OR REPLACE FUNCTION record_weekly_weight(
  p_workout_plan_id UUID,
  p_week_number INTEGER,
  p_weight_kg DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id UUID;
  v_previous_weight DECIMAL(5, 2);
  v_weight_lost DECIMAL(5, 2);
  v_existing_id UUID;
BEGIN
  -- Get the current user's ID
  v_client_user_id := auth.uid();

  IF v_client_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get previous week's weight to calculate weight lost
  SELECT weight_kg INTO v_previous_weight
  FROM client_weight_tracking
  WHERE client_user_id = v_client_user_id
    AND workout_plan_id = p_workout_plan_id
    AND week_number = p_week_number - 1
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate weight lost (positive means weight loss)
  IF v_previous_weight IS NOT NULL THEN
    v_weight_lost := v_previous_weight - p_weight_kg;
  ELSE
    v_weight_lost := NULL;
  END IF;

  -- Check if record already exists for this week
  SELECT id INTO v_existing_id
  FROM client_weight_tracking
  WHERE client_user_id = v_client_user_id
    AND workout_plan_id = p_workout_plan_id
    AND week_number = p_week_number;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE client_weight_tracking
    SET weight_kg = p_weight_kg,
        weight_lost_kg = v_weight_lost,
        measurement_date = CURRENT_DATE
    WHERE id = v_existing_id;

    RETURN json_build_object(
      'success', true,
      'weight_kg', p_weight_kg,
      'weight_lost_kg', v_weight_lost,
      'message', 'Weight updated successfully'
    );
  ELSE
    -- Insert new record
    INSERT INTO client_weight_tracking (
      client_user_id,
      workout_plan_id,
      week_number,
      weight_kg,
      weight_lost_kg
    ) VALUES (
      v_client_user_id,
      p_workout_plan_id,
      p_week_number,
      p_weight_kg,
      v_weight_lost
    );

    RETURN json_build_object(
      'success', true,
      'weight_kg', p_weight_kg,
      'weight_lost_kg', v_weight_lost,
      'message', 'Weight recorded successfully'
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_weekly_weight(UUID, INTEGER, DECIMAL) TO authenticated;
