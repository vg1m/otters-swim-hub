-- Backfill missing relationship field for existing profiles
-- This fixes the issue where users who registered before this field was required
-- now can't update their emergency contact information

-- Update profiles with NULL relationship to default value 'guardian'
UPDATE profiles
SET relationship = 'guardian'
WHERE relationship IS NULL;

-- Verify the update
SELECT 
  'Profiles updated' as result,
  COUNT(*) as count
FROM profiles
WHERE relationship = 'guardian';

-- Show all profiles with their relationship
SELECT 
  'All profiles' as check_type,
  id,
  full_name,
  email,
  relationship,
  emergency_contact_name,
  emergency_contact_relationship
FROM profiles
ORDER BY created_at DESC;
