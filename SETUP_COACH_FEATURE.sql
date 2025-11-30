-- ================================================
-- COMPLETE SETUP: Coach Assignment Feature
-- ================================================
-- Copy this entire file and paste it into Supabase SQL Editor
-- Then click "Run" to execute everything at once

-- Step 1: Add coach_id column to client_profiles
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

-- Step 2: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);

-- Step 3: Assign the first coach to all clients who don't have one
UPDATE client_profiles
SET coach_id = (SELECT id FROM coach_profiles LIMIT 1)
WHERE coach_id IS NULL;

-- Step 4: Verify the setup
SELECT
  cp.full_name as client_name,
  cp.coach_id,
  coach.full_name as assigned_coach
FROM client_profiles cp
LEFT JOIN coach_profiles coach ON cp.coach_id = coach.id;

-- ================================================
-- DONE! Your coach assignment feature is now ready!
-- Refresh your browser and go to the Coaches menu
-- ================================================
