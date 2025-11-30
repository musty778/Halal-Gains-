-- Add coach_id column to client_profiles table
-- This allows clients to be assigned to coaches

ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);

-- Optionally assign a default coach to existing clients (first coach in the system)
-- Uncomment the following lines if you want to auto-assign:
-- UPDATE client_profiles
-- SET coach_id = (SELECT id FROM coach_profiles LIMIT 1)
-- WHERE coach_id IS NULL;

-- Verify the changes
SELECT
  cp.full_name as client_name,
  cp.coach_id,
  coach.full_name as coach_name
FROM client_profiles cp
LEFT JOIN coach_profiles coach ON cp.coach_id = coach.id
LIMIT 5;
