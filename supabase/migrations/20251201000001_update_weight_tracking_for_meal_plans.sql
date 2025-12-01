-- Update weight tracking to support both workout plans and meal plans

-- Make workout_plan_id nullable and add meal_plan_id
ALTER TABLE client_weight_tracking
  ALTER COLUMN workout_plan_id DROP NOT NULL;

ALTER TABLE client_weight_tracking
  ADD COLUMN IF NOT EXISTS meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Add a check constraint to ensure either workout_plan_id or meal_plan_id is set (but not both)
ALTER TABLE client_weight_tracking
  ADD CONSTRAINT check_plan_type
  CHECK (
    (workout_plan_id IS NOT NULL AND meal_plan_id IS NULL) OR
    (workout_plan_id IS NULL AND meal_plan_id IS NOT NULL)
  );

-- Update the unique constraint to handle both workout and meal plans
ALTER TABLE client_weight_tracking
  DROP CONSTRAINT IF EXISTS client_weight_tracking_client_user_id_workout_plan_id_week_nu;

-- Add new unique constraints for both scenarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_tracking_workout_unique
  ON client_weight_tracking(client_user_id, workout_plan_id, week_number)
  WHERE workout_plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_tracking_meal_unique
  ON client_weight_tracking(client_user_id, meal_plan_id, week_number)
  WHERE meal_plan_id IS NOT NULL;

-- Create new function to record weight for meal plans
CREATE OR REPLACE FUNCTION record_meal_plan_weekly_weight(
  p_meal_plan_id UUID,
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
    AND meal_plan_id = p_meal_plan_id
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
    AND meal_plan_id = p_meal_plan_id
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
      meal_plan_id,
      week_number,
      weight_kg,
      weight_lost_kg
    ) VALUES (
      v_client_user_id,
      p_meal_plan_id,
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
GRANT EXECUTE ON FUNCTION record_meal_plan_weekly_weight(UUID, INTEGER, DECIMAL) TO authenticated;
