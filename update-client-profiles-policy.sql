-- Allow coaches to view their assigned clients' profiles

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view own client profile" ON client_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON client_profiles;

-- Create new policy that allows users to view their own profile AND coaches to view their clients' profiles
CREATE POLICY "Users and coaches can view client profiles"
  ON client_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1
      FROM coach_profiles
      WHERE coach_profiles.id = client_profiles.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );
