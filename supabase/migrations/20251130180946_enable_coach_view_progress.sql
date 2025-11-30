-- Enable coaches to view their clients' weight tracking and workout progress
-- This migration creates RLS policies that allow coaches to view (but not edit) their clients' data

-- Drop existing weight tracking policies
DROP POLICY IF EXISTS "Users can view own weight tracking" ON client_weight_tracking;
DROP POLICY IF EXISTS "Users can insert own weight tracking" ON client_weight_tracking;
DROP POLICY IF EXISTS "Users can update own weight tracking" ON client_weight_tracking;
DROP POLICY IF EXISTS "Coaches can view client weight tracking" ON client_weight_tracking;

-- Create new policies for weight tracking that allow coaches to view their clients' data

-- Policy: Users can view their own weight tracking
CREATE POLICY "Users can view own weight tracking"
  ON client_weight_tracking
  FOR SELECT
  USING (auth.uid() = client_user_id);

-- Policy: Coaches can view their clients' weight tracking
CREATE POLICY "Coaches can view client weight tracking"
  ON client_weight_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      JOIN coach_profiles coach ON cp.coach_id = coach.id
      WHERE cp.user_id = client_weight_tracking.client_user_id
        AND coach.user_id = auth.uid()
    )
  );

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

-- Update workout_day_completions policies to allow coaches to view

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own completions" ON workout_day_completions;
DROP POLICY IF EXISTS "Coaches can view client completions" ON workout_day_completions;

-- Create policies for workout_day_completions

-- Policy: Users can view their own completions
CREATE POLICY "Users can view own completions"
  ON workout_day_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Coaches can view their clients' completions
CREATE POLICY "Coaches can view client completions"
  ON workout_day_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      JOIN coach_profiles coach ON cp.coach_id = coach.id
      WHERE cp.user_id = workout_day_completions.user_id
        AND coach.user_id = auth.uid()
    )
  );

-- Update exercise_completions policies to allow coaches to view

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view exercise completions" ON exercise_completions;
DROP POLICY IF EXISTS "Coaches can view client exercise completions" ON exercise_completions;

-- Create policies for exercise_completions

-- Policy: Users can view their own exercise completions
CREATE POLICY "Users can view exercise completions"
  ON exercise_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_day_completions wdc
      WHERE wdc.id = exercise_completions.workout_day_completion_id
        AND wdc.user_id = auth.uid()
    )
  );

-- Policy: Coaches can view their clients' exercise completions
CREATE POLICY "Coaches can view client exercise completions"
  ON exercise_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_day_completions wdc
      JOIN client_profiles cp ON wdc.user_id = cp.user_id
      JOIN coach_profiles coach ON cp.coach_id = coach.id
      WHERE wdc.id = exercise_completions.workout_day_completion_id
        AND coach.user_id = auth.uid()
    )
  );
