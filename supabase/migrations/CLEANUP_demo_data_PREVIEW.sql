-- ============================================================
-- DEMO DATA CLEANUP - PREVIEW ONLY
-- ============================================================
-- This script ONLY shows what will be deleted
-- NO DATA IS ACTUALLY DELETED
-- Safe to run anytime to see what would be affected
-- ============================================================

-- Find parent accounts
SELECT 
  'PARENTS TO DELETE' as record_type,
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')

UNION ALL

-- Find swimmers
SELECT 
  'SWIMMERS TO DELETE' as record_type,
  s.id,
  s.first_name || ' ' || s.last_name as email,
  s.squad as full_name,
  s.status as role,
  s.created_at
FROM swimmers s
LEFT JOIN profiles p ON s.parent_id = p.id
WHERE 
  p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
  OR LOWER(s.first_name) IN ('marlee', 'turi')

ORDER BY record_type, created_at;

-- Count summary
SELECT 
  'SUMMARY' as section,
  (SELECT COUNT(*) FROM profiles WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')) as parents,
  (SELECT COUNT(*) FROM swimmers s
   LEFT JOIN profiles p ON s.parent_id = p.id
   WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
      OR LOWER(s.first_name) IN ('marlee', 'turi')) as swimmers,
  (SELECT COUNT(*) FROM attendance a
   WHERE a.swimmer_id IN (
     SELECT s.id FROM swimmers s
     LEFT JOIN profiles p ON s.parent_id = p.id
     WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
        OR LOWER(s.first_name) IN ('marlee', 'turi')
   )) as attendance_records,
  (SELECT COUNT(*) FROM invoices i
   LEFT JOIN profiles p ON i.parent_id = p.id
   WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
      OR i.swimmer_id IN (
        SELECT s.id FROM swimmers s
        WHERE LOWER(s.first_name) IN ('marlee', 'turi')
      )) as invoices,
  (SELECT COUNT(*) FROM registrations r
   WHERE r.swimmer_id IN (
     SELECT s.id FROM swimmers s
     LEFT JOIN profiles p ON s.parent_id = p.id
     WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
        OR LOWER(s.first_name) IN ('marlee', 'turi')
   )) as registrations,
  (SELECT COUNT(*) FROM registration_consents rc
   WHERE rc.swimmer_id IN (
     SELECT s.id FROM swimmers s
     LEFT JOIN profiles p ON s.parent_id = p.id
     WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
        OR LOWER(s.first_name) IN ('marlee', 'turi')
   )) as consents,
  (SELECT COUNT(*) FROM coach_assignments ca
   WHERE ca.swimmer_id IN (
     SELECT s.id FROM swimmers s
     LEFT JOIN profiles p ON s.parent_id = p.id
     WHERE p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
        OR LOWER(s.first_name) IN ('marlee', 'turi')
   )) as coach_assignments;

-- Detailed swimmer info
SELECT 
  s.first_name,
  s.last_name,
  s.date_of_birth,
  s.squad,
  s.status,
  p.email as parent_email,
  p.full_name as parent_name,
  s.created_at
FROM swimmers s
LEFT JOIN profiles p ON s.parent_id = p.id
WHERE 
  p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
  OR LOWER(s.first_name) IN ('marlee', 'turi')
ORDER BY s.created_at;

-- Invoices to be deleted
SELECT 
  i.id,
  i.invoice_number,
  i.amount,
  i.status,
  i.payment_method,
  p.email as parent_email,
  s.first_name || ' ' || s.last_name as swimmer_name,
  i.created_at
FROM invoices i
LEFT JOIN profiles p ON i.parent_id = p.id
LEFT JOIN swimmers s ON i.swimmer_id = s.id
WHERE 
  p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
  OR i.swimmer_id IN (
    SELECT s.id FROM swimmers s
    WHERE LOWER(s.first_name) IN ('marlee', 'turi')
  )
ORDER BY i.created_at;
