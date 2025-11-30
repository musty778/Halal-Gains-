-- Update RLS policies to allow coaches to view their clients' exercise completions

-- Drop the existing view policy
DROP POLICY IF EXISTS "Users can view own completions" ON workout_exercise_completions;

-- Create new policy that allows users to view their own completions AND coaches to view their clients' completions
CREATE POLICY "Users and coaches can view completions"
  ON workout_exercise_completions
  FOR SELECT
  USING (
    -- Users can view their own completions
    auth.uid() = client_user_id
    OR
    -- Coaches can view their clients' completions
    EXISTS (
      SELECT 1
      FROM client_profiles cp
      JOIN coach_profiles coach ON coach.id = cp.coach_id
      WHERE cp.user_id = workout_exercise_completions.client_user_id
        AND coach.user_id = auth.uid()
    )
  );
