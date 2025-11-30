-- Update all coach profile photos to male coaches
-- Copy and paste this into your Supabase SQL Editor and click Run

-- Update Fatima Al-Rahman
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80']
WHERE full_name = 'Fatima Al-Rahman';

-- Update Ahmed Hassan
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80']
WHERE full_name = 'Ahmed Hassan';

-- Update Sarah Johnson
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80']
WHERE full_name = 'Sarah Johnson';

-- Update Ibrahim Osman
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80']
WHERE full_name = 'Ibrahim Osman';

-- Update Aisha Malik
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&q=80']
WHERE full_name = 'Aisha Malik';

-- Update donald trump (already has a custom photo, but updating for consistency)
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80']
WHERE full_name = 'donald trump';

-- Verify the changes
SELECT full_name, profile_photos FROM coach_profiles ORDER BY full_name;
