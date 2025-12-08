-- Update Fatima Al-Rahman's profile photo to use the local image
UPDATE coach_profiles
SET profile_photos = ARRAY['/assets/coaches/fatima-al-rahman.avif']
WHERE full_name = 'Fatima Al-Rahman';
