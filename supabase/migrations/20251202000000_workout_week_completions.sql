-- Create table for tracking workout week completions
-- This table tracks when a client completes an entire week of a workout plan

CREATE TABLE IF NOT EXISTS workout_week_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weight_kg DECIMAL(5, 2),
  UNIQUE(workout_plan_id, user_id, week_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_week_completions_user
  ON workout_week_completions(user_id, workout_plan_id);

CREATE INDEX IF NOT EXISTS idx_workout_week_completions_week
  ON workout_week_completions(workout_plan_id, week_number);

-- Enable RLS
ALTER TABLE workout_week_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own week completions
DO $$ BEGIN
  CREATE POLICY "Users can view own workout week completions"
    ON workout_week_completions
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Users can insert their own week completions
DO $$ BEGIN
  CREATE POLICY "Users can insert own workout week completions"
    ON workout_week_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Coaches can view their clients' week completions
DO $$ BEGIN
  CREATE POLICY "Coaches can view client workout week completions"
    ON workout_week_completions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM workout_plans wp
        JOIN coach_profiles cp ON cp.id = wp.coach_id
        WHERE wp.id = workout_week_completions.workout_plan_id
          AND cp.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Grant permissions
GRANT SELECT, INSERT ON workout_week_completions TO authenticated;
