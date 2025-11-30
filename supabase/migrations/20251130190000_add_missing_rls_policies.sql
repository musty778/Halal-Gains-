-- Add missing RLS policies for core tables

-- ============================================
-- COACH PROFILES
-- ============================================
-- Enable RLS on coach_profiles if not already enabled
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view own profile" ON coach_profiles;
DROP POLICY IF EXISTS "Users can view coach profiles" ON coach_profiles;

-- Policy: Coaches can view their own profile
CREATE POLICY "Coaches can view own profile"
  ON coach_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Anyone can view coach profiles (for client assignment)
CREATE POLICY "Users can view coach profiles"
  ON coach_profiles
  FOR SELECT
  USING (true);

-- ============================================
-- CLIENT PROFILES
-- ============================================
-- Enable RLS on client_profiles if not already enabled
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own client profile" ON client_profiles;
DROP POLICY IF EXISTS "Coaches can view their clients" ON client_profiles;

-- Policy: Users can view their own client profile
CREATE POLICY "Users can view own client profile"
  ON client_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Coaches can view their assigned clients
CREATE POLICY "Coaches can view their clients"
  ON client_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_profiles
      WHERE coach_profiles.id = client_profiles.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- WORKOUT DAY COMPLETIONS
-- ============================================
-- Enable RLS on workout_day_completions if not already enabled
ALTER TABLE workout_day_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own completions" ON workout_day_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON workout_day_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON workout_day_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON workout_day_completions;
DROP POLICY IF EXISTS "Coaches can view client completions" ON workout_day_completions;

-- Policy: Users can view their own workout completions
CREATE POLICY "Users can view own completions"
  ON workout_day_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own workout completions
CREATE POLICY "Users can insert own completions"
  ON workout_day_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workout completions
CREATE POLICY "Users can update own completions"
  ON workout_day_completions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own workout completions
CREATE POLICY "Users can delete own completions"
  ON workout_day_completions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Coaches can view their clients' workout completions
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

-- ============================================
-- EXERCISE COMPLETIONS
-- ============================================
-- Enable RLS on exercise_completions if not already enabled
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view exercise completions" ON exercise_completions;
DROP POLICY IF EXISTS "Users can insert exercise completions" ON exercise_completions;
DROP POLICY IF EXISTS "Users can update exercise completions" ON exercise_completions;
DROP POLICY IF EXISTS "Users can delete exercise completions" ON exercise_completions;
DROP POLICY IF EXISTS "Coaches can view client exercise completions" ON exercise_completions;

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

-- Policy: Users can insert exercise completions for their own workouts
CREATE POLICY "Users can insert exercise completions"
  ON exercise_completions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_day_completions wdc
      WHERE wdc.id = exercise_completions.workout_day_completion_id
        AND wdc.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own exercise completions
CREATE POLICY "Users can update exercise completions"
  ON exercise_completions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_day_completions wdc
      WHERE wdc.id = exercise_completions.workout_day_completion_id
        AND wdc.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own exercise completions
CREATE POLICY "Users can delete exercise completions"
  ON exercise_completions
  FOR DELETE
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

-- ============================================
-- WORKOUT PLANS
-- ============================================
-- Enable RLS on workout_plans if not already enabled
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Coaches can view client workout plans" ON workout_plans;

-- Policy: Users can view their own workout plans
CREATE POLICY "Users can view own workout plans"
  ON workout_plans
  FOR SELECT
  USING (auth.uid() = client_id);

-- Policy: Coaches can view their clients' workout plans
CREATE POLICY "Coaches can view client workout plans"
  ON workout_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      JOIN coach_profiles coach ON cp.coach_id = coach.id
      WHERE cp.user_id = workout_plans.client_id
        AND coach.user_id = auth.uid()
    )
  );

-- ============================================
-- WORKOUT WEEKS
-- ============================================
-- Enable RLS on workout_weeks if not already enabled
ALTER TABLE workout_weeks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workout weeks" ON workout_weeks;

-- Policy: Users can view workout weeks for their plans
CREATE POLICY "Users can view workout weeks"
  ON workout_weeks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans wp
      WHERE wp.id = workout_weeks.workout_plan_id
        AND (
          wp.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_profiles cp
            JOIN coach_profiles coach ON cp.coach_id = coach.id
            WHERE cp.user_id = wp.client_id
              AND coach.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================
-- WORKOUT DAYS
-- ============================================
-- Enable RLS on workout_days if not already enabled
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workout days" ON workout_days;

-- Policy: Users can view workout days
CREATE POLICY "Users can view workout days"
  ON workout_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_weeks ww
      JOIN workout_plans wp ON ww.workout_plan_id = wp.id
      WHERE ww.id = workout_days.workout_week_id
        AND (
          wp.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_profiles cp
            JOIN coach_profiles coach ON cp.coach_id = coach.id
            WHERE cp.user_id = wp.client_id
              AND coach.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================
-- WORKOUT EXERCISES
-- ============================================
-- Enable RLS on workout_exercises if not already enabled
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workout exercises" ON workout_exercises;

-- Policy: Users can view workout exercises
CREATE POLICY "Users can view workout exercises"
  ON workout_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_days wd
      JOIN workout_weeks ww ON wd.workout_week_id = ww.id
      JOIN workout_plans wp ON ww.workout_plan_id = wp.id
      WHERE wd.id = workout_exercises.workout_day_id
        AND (
          wp.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM client_profiles cp
            JOIN coach_profiles coach ON cp.coach_id = coach.id
            WHERE cp.user_id = wp.client_id
              AND coach.user_id = auth.uid()
          )
        )
    )
  );
