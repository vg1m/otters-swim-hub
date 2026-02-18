-- Fix orphaned consents that weren't linked when users signed up
-- This ensures consent history shows up on the /settings page

-- 1. Link orphaned consents to parents via swimmers
-- If a swimmer has a parent_id, link their consent to that parent
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;

-- 2. Show results of the linking
SELECT 
  'Linked consents' as result,
  COUNT(*) as count
FROM registration_consents
WHERE parent_id IS NOT NULL;

-- 3. Check for any remaining orphaned consents
SELECT 
  'Orphaned consents (still unlinked)' as result,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT s.first_name || ' ' || s.last_name) as swimmer_names
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.parent_id IS NULL;

-- 4. Show consent history for all users
SELECT 
  'Consent history by user' as check_type,
  p.email as parent_email,
  p.full_name as parent_name,
  COUNT(rc.id) as consent_count,
  ARRAY_AGG(s.first_name || ' ' || s.last_name) as swimmers
FROM profiles p
LEFT JOIN registration_consents rc ON rc.parent_id = p.id
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
GROUP BY p.id, p.email, p.full_name
HAVING COUNT(rc.id) > 0
ORDER BY p.created_at DESC;
