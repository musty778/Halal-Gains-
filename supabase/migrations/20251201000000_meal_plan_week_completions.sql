-- Create table for tracking meal plan week completions
-- This table tracks when a client completes an entire week of a meal plan

CREATE TABLE IF NOT EXISTS meal_plan_week_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weight_kg DECIMAL(5, 2),
  UNIQUE(meal_plan_id, user_id, week_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_week_completions_user
  ON meal_plan_week_completions(user_id, meal_plan_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_week_completions_week
  ON meal_plan_week_completions(meal_plan_id, week_number);

-- Enable RLS
ALTER TABLE meal_plan_week_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own week completions
CREATE POLICY "Users can view own meal plan week completions"
  ON meal_plan_week_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own week completions
CREATE POLICY "Users can insert own meal plan week completions"
  ON meal_plan_week_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Coaches can view their clients' week completions
CREATE POLICY "Coaches can view client meal plan week completions"
  ON meal_plan_week_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN coach_profiles cp ON cp.id = mp.coach_id
      WHERE mp.id = meal_plan_week_completions.meal_plan_id
        AND cp.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON meal_plan_week_completions TO authenticated;
