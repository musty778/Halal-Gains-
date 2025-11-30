-- Update coach profile photos from women to men
-- Run this in your Supabase SQL Editor

-- Male fitness coach stock photos from Unsplash
-- These are professional, free-to-use images

UPDATE coach_profiles
SET profile_photos = ARRAY[
  'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80', -- Male coach with dumbbells
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'  -- Male coach portrait
]
WHERE id IN (
  SELECT id FROM coach_profiles LIMIT 1
);

-- If you have multiple coaches, you can update them individually
-- Example for different coaches:

-- Coach 1: Athletic trainer
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80']
WHERE full_name ILIKE '%first coach name%';

-- Coach 2: Strength coach
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80']
WHERE full_name ILIKE '%second coach name%';

-- Coach 3: Personal trainer
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80']
WHERE full_name ILIKE '%third coach name%';

-- Coach 4: Fitness coach
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1623874514711-0f321325f318?w=800&q=80']
WHERE full_name ILIKE '%fourth coach name%';

-- Coach 5: Bodybuilding coach
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80']
WHERE full_name ILIKE '%fifth coach name%';

-- Or update ALL coaches at once with random male coach photos:
UPDATE coach_profiles
SET profile_photos = CASE
  WHEN (id::text)::int % 5 = 0 THEN ARRAY['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80']
  WHEN (id::text)::int % 5 = 1 THEN ARRAY['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80']
  WHEN (id::text)::int % 5 = 2 THEN ARRAY['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80']
  WHEN (id::text)::int % 5 = 3 THEN ARRAY['https://images.unsplash.com/photo-1623874514711-0f321325f318?w=800&q=80']
  ELSE ARRAY['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80']
END;

-- Verify the update
SELECT id, full_name, profile_photos FROM coach_profiles;
