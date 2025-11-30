-- Create table for tracking meal plan day completions
-- This allows clients to track which days they've completed in their meal plan

CREATE TABLE IF NOT EXISTS meal_plan_day_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_day_id UUID NOT NULL REFERENCES meal_plan_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meal_plan_day_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_day_completions_user
  ON meal_plan_day_completions(user_id, meal_plan_day_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_day_completions_day
  ON meal_plan_day_completions(meal_plan_day_id);

-- Enable RLS
ALTER TABLE meal_plan_day_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own meal completions" ON meal_plan_day_completions;
DROP POLICY IF EXISTS "Users can insert own meal completions" ON meal_plan_day_completions;
DROP POLICY IF EXISTS "Users can update own meal completions" ON meal_plan_day_completions;
DROP POLICY IF EXISTS "Users can delete own meal completions" ON meal_plan_day_completions;
DROP POLICY IF EXISTS "Coaches can view client meal completions" ON meal_plan_day_completions;

-- Policy: Users can view their own meal plan completions
CREATE POLICY "Users can view own meal completions"
  ON meal_plan_day_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own meal plan completions
CREATE POLICY "Users can insert own meal completions"
  ON meal_plan_day_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own meal plan completions
CREATE POLICY "Users can update own meal completions"
  ON meal_plan_day_completions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own meal plan completions
CREATE POLICY "Users can delete own meal completions"
  ON meal_plan_day_completions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Coaches can view their clients' meal plan completions
CREATE POLICY "Coaches can view client meal completions"
  ON meal_plan_day_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_days mpd
      JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
      JOIN client_profiles cp ON mp.client_id = cp.user_id
      JOIN coach_profiles coach ON cp.coach_id = coach.id
      WHERE mpd.id = meal_plan_day_completions.meal_plan_day_id
        AND coach.user_id = auth.uid()
    )
  );
