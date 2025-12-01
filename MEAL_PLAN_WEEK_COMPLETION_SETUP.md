# Meal Plan Week Completion Setup

This guide will help you set up the new meal plan week completion feature with weight tracking.

## Features Added

1. **Week Completion Tracking**: Clients can complete entire weeks of meal plans
2. **Weight Entry Prompt**: When completing a week, clients are prompted to enter their weight
3. **Persistent State**: Once a week is marked as completed, the button changes to "Completed" and becomes disabled
4. **Weight Tracking**: Weights are recorded and tracked over time with automatic weight loss calculations

## Database Migrations

You need to run the following SQL migrations in your Supabase dashboard:

### Step 1: Create Meal Plan Week Completions Table

Run this migration file: `supabase/migrations/20251201000000_meal_plan_week_completions.sql`

Or copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Create table for tracking meal plan week completions
CREATE TABLE IF NOT EXISTS meal_plan_week_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weight_kg DECIMAL(5, 2),
  UNIQUE(meal_plan_id, user_id, week_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_week_completions_user
  ON meal_plan_week_completions(user_id, meal_plan_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_week_completions_week
  ON meal_plan_week_completions(meal_plan_id, week_number);

-- Enable RLS
ALTER TABLE meal_plan_week_completions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own meal plan week completions"
  ON meal_plan_week_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plan week completions"
  ON meal_plan_week_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view client meal plan week completions"
  ON meal_plan_week_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN coach_profiles cp ON cp.id = mp.coach_id
      WHERE mp.id = meal_plan_week_completions.meal_plan_id
        AND cp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON meal_plan_week_completions TO authenticated;
```

### Step 2: Update Weight Tracking for Meal Plans

Run this migration file: `supabase/migrations/20251201000001_update_weight_tracking_for_meal_plans.sql`

Or copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Update weight tracking to support both workout plans and meal plans
ALTER TABLE client_weight_tracking
  ALTER COLUMN workout_plan_id DROP NOT NULL;

ALTER TABLE client_weight_tracking
  ADD COLUMN IF NOT EXISTS meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Add check constraint
ALTER TABLE client_weight_tracking
  ADD CONSTRAINT check_plan_type
  CHECK (
    (workout_plan_id IS NOT NULL AND meal_plan_id IS NULL) OR
    (workout_plan_id IS NULL AND meal_plan_id IS NOT NULL)
  );

-- Update unique constraints
ALTER TABLE client_weight_tracking
  DROP CONSTRAINT IF EXISTS client_weight_tracking_client_user_id_workout_plan_id_week_nu;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_tracking_workout_unique
  ON client_weight_tracking(client_user_id, workout_plan_id, week_number)
  WHERE workout_plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_tracking_meal_unique
  ON client_weight_tracking(client_user_id, meal_plan_id, week_number)
  WHERE meal_plan_id IS NOT NULL;

-- Create function for meal plan weight tracking
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
  v_client_user_id := auth.uid();

  IF v_client_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get previous week's weight
  SELECT weight_kg INTO v_previous_weight
  FROM client_weight_tracking
  WHERE client_user_id = v_client_user_id
    AND meal_plan_id = p_meal_plan_id
    AND week_number = p_week_number - 1
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate weight lost
  IF v_previous_weight IS NOT NULL THEN
    v_weight_lost := v_previous_weight - p_weight_kg;
  ELSE
    v_weight_lost := NULL;
  END IF;

  -- Check if record exists
  SELECT id INTO v_existing_id
  FROM client_weight_tracking
  WHERE client_user_id = v_client_user_id
    AND meal_plan_id = p_meal_plan_id
    AND week_number = p_week_number;

  IF v_existing_id IS NOT NULL THEN
    UPDATE client_weight_tracking
    SET weight_kg = p_weight_kg,
        weight_lost_kg = v_weight_lost,
        measurement_date = CURRENT_DATE
    WHERE id = v_existing_id;

    RETURN json_build_object('success', true, 'weight_kg', p_weight_kg, 'weight_lost_kg', v_weight_lost, 'message', 'Weight updated successfully');
  ELSE
    INSERT INTO client_weight_tracking (client_user_id, meal_plan_id, week_number, weight_kg, weight_lost_kg)
    VALUES (v_client_user_id, p_meal_plan_id, p_week_number, p_weight_kg, v_weight_lost);

    RETURN json_build_object('success', true, 'weight_kg', p_weight_kg, 'weight_lost_kg', v_weight_lost, 'message', 'Weight recorded successfully');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION record_meal_plan_weekly_weight(UUID, INTEGER, DECIMAL) TO authenticated;
```

## How It Works

### For Clients:

1. **Complete Individual Days**: Check off individual days as you complete them throughout the week
2. **Complete Week Button**: Once all 7 days in a week are checked off, a green "Complete Week" button appears
3. **Enter Weight**: When you click "Complete Week", a modal appears asking for your current weight
4. **Track Progress**: Your weight is recorded and the week is marked as completed
5. **Completed State**: The button changes to "Completed" (gray, disabled) to prevent re-clicking

### For Coaches:

- Coaches can view which weeks their clients have completed
- Coaches can see client weight progress over time
- The completion data helps coaches track client adherence

## User Flow

```
1. Client completes all days in Week 1 (checks 7 checkboxes)
   ↓
2. "Complete Week" button appears (green)
   ↓
3. Client clicks "Complete Week"
   ↓
4. Weight entry modal appears
   ↓
5. Client enters weight (e.g., 75.5 kg)
   ↓
6. Client clicks "Submit Weight"
   ↓
7. Week is marked as completed
8. Weight is recorded in database
9. Button changes to "Completed" (gray, disabled)
10. Success message appears
```

## Database Structure

### meal_plan_week_completions
- `id`: Unique identifier
- `meal_plan_id`: Reference to the meal plan
- `user_id`: The client who completed the week
- `week_number`: Which week was completed (1, 2, 3, etc.)
- `completed_at`: Timestamp of completion
- `weight_kg`: Optional weight recorded at completion

### client_weight_tracking (updated)
- Now supports both `workout_plan_id` and `meal_plan_id`
- Automatically calculates weight loss compared to previous week
- Tracks historical weight data

## Testing

To test the feature:

1. Log in as a client
2. Open a meal plan that has at least 7 days (Week 1)
3. Check off all 7 days in Week 1
4. Click the "Complete Week" button
5. Enter a weight (e.g., 80.5)
6. Click "Submit Weight"
7. Verify the button changes to "Completed" and is disabled
8. Try clicking "Completed" - it should not do anything
9. Check the database to confirm the records were created

## Notes

- Week numbers are calculated as: `Math.ceil(day_number / 7)`
- Day 1-7 = Week 1
- Day 8-14 = Week 2
- And so on...

- Weight tracking is optional but recommended for progress monitoring
- Once a week is completed, it cannot be un-completed (to maintain data integrity)
- The feature integrates with the existing progress tracking system
