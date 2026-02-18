-- Diagnose why consent history is blank on settings page

-- 1. Check if registration_consents table has any data
SELECT 
  'All registration_consents' as check_type,
  COUNT(*) as total_count
FROM registration_consents;

-- 2. Check recent consent records with details
SELECT 
  'Recent consents' as check_type,
  rc.id,
  rc.parent_id,
  rc.swimmer_id,
  rc.data_accuracy_consent,
  rc.code_of_conduct_consent,
  rc.media_consent,
  rc.consented_at,
  rc.consent_text,
  p.email as parent_email
FROM registration_consents rc
LEFT JOIN profiles p ON p.id = rc.parent_id
ORDER BY rc.consented_at DESC
LIMIT 10;

-- 3. Check if there are consents with NULL parent_id (orphaned)
SELECT 
  'Orphaned consents' as check_type,
  COUNT(*) as count
FROM registration_consents
WHERE parent_id IS NULL;

-- 4. Check consents for a specific user (replace with actual user ID)
SELECT 
  'Consents for user' as check_type,
  rc.*,
  s.first_name,
  s.last_name
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.parent_id = auth.uid()
ORDER BY rc.consented_at DESC;

-- 5. Check if swimmers table has matching records
SELECT 
  'Swimmers check' as check_type,
  s.id,
  s.first_name,
  s.last_name,
  s.parent_id,
  s.status,
  COUNT(rc.id) as consent_count
FROM swimmers s
LEFT JOIN registration_consents rc ON rc.swimmer_id = s.id
WHERE s.parent_id IS NOT NULL
GROUP BY s.id, s.first_name, s.last_name, s.parent_id, s.status
ORDER BY s.created_at DESC
LIMIT 10;
