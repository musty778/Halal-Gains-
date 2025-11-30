-- STEP 1: Temporarily allow anon users to update coach profiles
-- (We'll revoke this after the update)
CREATE POLICY "Allow anon updates for photo fix" ON coach_profiles
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- STEP 2: Update all coach photos to male coaches
UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80']
WHERE full_name = 'Fatima Al-Rahman';

UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80']
WHERE full_name = 'Ahmed Hassan';

UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80']
WHERE full_name = 'Sarah Johnson';

UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80']
WHERE full_name = 'Ibrahim Osman';

UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&q=80']
WHERE full_name = 'Aisha Malik';

UPDATE coach_profiles
SET profile_photos = ARRAY['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80']
WHERE full_name = 'donald trump';

-- STEP 3: Remove the temporary policy (for security)
DROP POLICY IF EXISTS "Allow anon updates for photo fix" ON coach_profiles;

-- STEP 4: Verify all changes
SELECT full_name, profile_photos FROM coach_profiles ORDER BY full_name;
