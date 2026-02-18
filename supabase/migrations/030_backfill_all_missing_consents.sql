-- Backfill consent records for all swimmers who don't have them
-- Since registration required checking consent boxes, we can safely assume consent was given

-- First, show current state
SELECT 
  'Before backfill' as status,
  (SELECT COUNT(*) FROM swimmers) as total_swimmers,
  (SELECT COUNT(*) FROM registration_consents) as total_consents,
  (SELECT COUNT(*) FROM swimmers WHERE NOT EXISTS (
    SELECT 1 FROM registration_consents WHERE swimmer_id = swimmers.id
  )) as swimmers_without_consents;

-- Create consent records for swimmers who don't have them
INSERT INTO registration_consents (
  parent_id,
  swimmer_id,
  media_consent,
  code_of_conduct_consent,
  data_accuracy_confirmed,
  consent_text,
  consented_at,
  ip_address,
  user_agent,
  created_at
)
SELECT 
  s.parent_id,  -- Use swimmer's parent_id (may be NULL for orphaned)
  s.id as swimmer_id,
  true as media_consent,  -- Default to true (can be updated later)
  true as code_of_conduct_consent,  -- Required for registration
  true as data_accuracy_confirmed,  -- Required for registration
  'By registering with Otters:

I confirm that the information provided above is accurate and complete to the best of my knowledge.

I agree to ensure that I / my child abides by the club''s code of conduct, safety rules, and any instructions issued by coaches or staff.

I consent to the use of photographs or videos of myself / my child taken during training or competitions for club-related promotional materials, social media, or reports. If I do not wish to give media consent, I will notify the club in writing.

I acknowledge that registration is only complete upon payment of the non-refundable annual registration fee of KES 3,000.

[Backfilled consent record - created during system migration]' as consent_text,
  s.created_at as consented_at,  -- Use swimmer creation time as consent time
  NULL as ip_address,  -- Not available for historical data
  'System Migration - Backfilled' as user_agent,
  NOW() as created_at
FROM swimmers s
WHERE NOT EXISTS (
  SELECT 1 FROM registration_consents rc 
  WHERE rc.swimmer_id = s.id
);

-- Show results after backfill
SELECT 
  'After backfill' as status,
  (SELECT COUNT(*) FROM swimmers) as total_swimmers,
  (SELECT COUNT(*) FROM registration_consents) as total_consents,
  (SELECT COUNT(*) FROM swimmers WHERE NOT EXISTS (
    SELECT 1 FROM registration_consents WHERE swimmer_id = swimmers.id
  )) as swimmers_without_consents;

-- Show breakdown by parent linkage
SELECT 
  'Consent linkage breakdown' as status,
  COUNT(*) as total_consents,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as linked_to_parent,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as orphaned
FROM registration_consents;

-- Show sample of newly created consents
SELECT 
  'Sample backfilled consents' as status,
  rc.id,
  rc.parent_id,
  rc.swimmer_id,
  s.first_name || ' ' || s.last_name as swimmer_name,
  s.parent_id as swimmer_parent_id,
  rc.consented_at,
  rc.user_agent
FROM registration_consents rc
JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.user_agent = 'System Migration - Backfilled'
ORDER BY rc.created_at DESC
LIMIT 10;

-- Link orphaned consents to parents via swimmers (if swimmer has parent_id)
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;

-- Final count
SELECT 
  'Final state' as status,
  COUNT(*) as total_consents,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as linked_to_parent,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as still_orphaned
FROM registration_consents;

-- Show which parents now have consent records
SELECT 
  'Parents with consents' as status,
  p.id,
  p.email,
  p.full_name,
  COUNT(rc.id) as consent_count,
  ARRAY_AGG(s.first_name || ' ' || s.last_name) as swimmers
FROM profiles p
JOIN registration_consents rc ON rc.parent_id = p.id
JOIN swimmers s ON s.id = rc.swimmer_id
GROUP BY p.id, p.email, p.full_name
ORDER BY p.created_at DESC;
