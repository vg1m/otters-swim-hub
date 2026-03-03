-- ============================================================
-- DEMO DATA CLEANUP - DIRECT EXECUTION VERSION
-- ============================================================
-- This version commits automatically. Use with caution!
-- For safer version with manual review, use CLEANUP_demo_data.sql
-- ============================================================

-- Delete in correct order (child records first)

-- 1. Attendance records
DELETE FROM attendance
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

-- 2. Invoice line items
DELETE FROM invoice_line_items
WHERE invoice_id IN (
  SELECT i.id FROM invoices i
  LEFT JOIN profiles p ON i.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR i.swimmer_id IN (
      SELECT s.id FROM swimmers s
      WHERE LOWER(s.first_name) IN ('marlee', 'turi')
    )
);

-- 3. Invoices
DELETE FROM invoices
WHERE parent_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
)
OR swimmer_id IN (
  SELECT s.id FROM swimmers s
  WHERE LOWER(s.first_name) IN ('marlee', 'turi')
);

-- 4. Registration consents
DELETE FROM registration_consents
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

-- 5. Registrations
DELETE FROM registrations
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

-- 6. Coach assignments
DELETE FROM coach_assignments
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

-- 7. Swimmers
DELETE FROM swimmers
WHERE parent_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
)
OR LOWER(first_name) IN ('marlee', 'turi');

-- 8. Parent profiles
DELETE FROM profiles
WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');

-- 9. Auth users (requires admin privileges)
DELETE FROM auth.users
WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');

-- Verification query (run after deletion)
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')) as remaining_parents,
  (SELECT COUNT(*) FROM swimmers WHERE LOWER(first_name) IN ('marlee', 'turi')) as remaining_swimmers;
