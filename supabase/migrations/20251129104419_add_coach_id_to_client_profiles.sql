-- Add coach_id column to client_profiles table
-- This allows clients to be assigned to coaches

-- Add the column
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);

-- Optionally assign the first coach to existing clients without a coach
UPDATE client_profiles
SET coach_id = (SELECT id FROM coach_profiles ORDER BY created_at LIMIT 1)
WHERE coach_id IS NULL;
