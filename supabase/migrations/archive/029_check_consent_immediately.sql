-- Check for consent records created in the last 5 minutes
-- Run this IMMEDIATELY after a test registration

SELECT 
  'Consents from last 5 minutes' as check_type,
  rc.id,
  rc.parent_id,
  rc.swimmer_id,
  rc.media_consent,
  rc.code_of_conduct_consent,
  rc.data_accuracy_confirmed,
  LEFT(rc.consent_text, 50) || '...' as consent_text_preview,
  rc.consented_at,
  rc.created_at,
  s.first_name || ' ' || s.last_name as swimmer_name,
  s.parent_id as swimmer_parent_id
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY rc.created_at DESC;

-- Check if there are ANY consents at all
SELECT 
  'All consents ever' as check_type,
  COUNT(*) as total_count
FROM registration_consents;

-- Check if the table has any triggers that might delete data
SELECT 
  'Triggers on registration_consents' as check_type,
  trigger_name,
  event_manipulation as trigger_event,
  action_timing as when_fires,
  action_statement as trigger_action
FROM information_schema.triggers
WHERE event_object_table = 'registration_consents'
  AND event_object_schema = 'public';

-- Check for any foreign key constraints that might cascade delete
SELECT
  'Foreign keys on registration_consents' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'registration_consents'
  AND tc.constraint_type = 'FOREIGN KEY';
