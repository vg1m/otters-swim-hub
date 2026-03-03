-- ============================================================
-- DEMO DATA CLEANUP SCRIPT
-- ============================================================
-- Purpose: Remove all test/demo data for specified parents and swimmers
-- Parents: acwzsr@hi2.in, enbcqbfh@hi2.in, gctmzcr@hi2.in
-- Swimmers: 'marlee', 'turi' (first_name)
-- 
-- IMPORTANT: Review the data to be deleted before running!
-- ============================================================

-- Start transaction for safety
BEGIN;

-- ============================================================
-- STEP 1: IDENTIFY DATA TO BE DELETED
-- ============================================================

DO $$
DECLARE
  v_parent_count INTEGER;
  v_swimmer_count INTEGER;
  v_attendance_count INTEGER;
  v_invoice_count INTEGER;
  v_registration_count INTEGER;
  v_consent_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DEMO DATA CLEANUP - VERIFICATION';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- Count parents to be deleted
  SELECT COUNT(*) INTO v_parent_count
  FROM profiles
  WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');
  
  RAISE NOTICE '📧 Parents to delete: %', v_parent_count;
  RAISE NOTICE '';

  -- List parent details
  IF v_parent_count > 0 THEN
    RAISE NOTICE 'Parent accounts:';
    FOR rec IN 
      SELECT email, full_name, created_at 
      FROM profiles 
      WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    LOOP
      RAISE NOTICE '  - % (%) - created %', rec.email, rec.full_name, rec.created_at;
    END LOOP;
    RAISE NOTICE '';
  END IF;

  -- Count swimmers to be deleted
  SELECT COUNT(*) INTO v_swimmer_count
  FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi');
  
  RAISE NOTICE '🏊 Swimmers to delete: %', v_swimmer_count;
  RAISE NOTICE '';

  -- List swimmer details
  IF v_swimmer_count > 0 THEN
    RAISE NOTICE 'Swimmer records:';
    FOR rec IN 
      SELECT s.first_name, s.last_name, s.squad, s.status, p.email as parent_email
      FROM swimmers s
      LEFT JOIN profiles p ON s.parent_id = p.id
      WHERE 
        p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
        OR LOWER(s.first_name) IN ('marlee', 'turi')
    LOOP
      RAISE NOTICE '  - % % (squad: %, status: %, parent: %)', 
        rec.first_name, rec.last_name, rec.squad, rec.status, COALESCE(rec.parent_email, 'orphaned');
    END LOOP;
    RAISE NOTICE '';
  END IF;

  -- Count attendance records
  SELECT COUNT(*) INTO v_attendance_count
  FROM attendance a
  WHERE a.swimmer_id IN (
    SELECT s.id FROM swimmers s
    LEFT JOIN profiles p ON s.parent_id = p.id
    WHERE 
      p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
      OR LOWER(s.first_name) IN ('marlee', 'turi')
  );
  
  RAISE NOTICE '✅ Attendance records to delete: %', v_attendance_count;

  -- Count invoices
  SELECT COUNT(*) INTO v_invoice_count
  FROM invoices i
  LEFT JOIN profiles p ON i.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR i.swimmer_id IN (
      SELECT s.id FROM swimmers s
      WHERE LOWER(s.first_name) IN ('marlee', 'turi')
    );
  
  RAISE NOTICE '💰 Invoices to delete: %', v_invoice_count;

  -- Count registrations
  SELECT COUNT(*) INTO v_registration_count
  FROM registrations r
  WHERE r.swimmer_id IN (
    SELECT s.id FROM swimmers s
    LEFT JOIN profiles p ON s.parent_id = p.id
    WHERE 
      p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
      OR LOWER(s.first_name) IN ('marlee', 'turi')
  );
  
  RAISE NOTICE '📝 Registrations to delete: %', v_registration_count;

  -- Count consents
  SELECT COUNT(*) INTO v_consent_count
  FROM registration_consents rc
  WHERE rc.swimmer_id IN (
    SELECT s.id FROM swimmers s
    LEFT JOIN profiles p ON s.parent_id = p.id
    WHERE 
      p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
      OR LOWER(s.first_name) IN ('marlee', 'turi')
  );
  
  RAISE NOTICE '📋 Consents to delete: %', v_consent_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 2: DELETE DATA (in correct order)
-- ============================================================

RAISE NOTICE '🗑️  Starting deletion...';
RAISE NOTICE '';

-- Delete attendance records
DELETE FROM attendance
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

RAISE NOTICE '✅ Deleted attendance records';

-- Delete invoice line items (must be before invoices)
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

RAISE NOTICE '✅ Deleted invoice line items';

-- Delete invoices
DELETE FROM invoices
WHERE parent_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
)
OR swimmer_id IN (
  SELECT s.id FROM swimmers s
  WHERE LOWER(s.first_name) IN ('marlee', 'turi')
);

RAISE NOTICE '✅ Deleted invoices';

-- Delete registration consents
DELETE FROM registration_consents
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

RAISE NOTICE '✅ Deleted registration consents';

-- Delete registrations
DELETE FROM registrations
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

RAISE NOTICE '✅ Deleted registrations';

-- Delete coach assignments for these swimmers (if any)
DELETE FROM coach_assignments
WHERE swimmer_id IN (
  SELECT s.id FROM swimmers s
  LEFT JOIN profiles p ON s.parent_id = p.id
  WHERE 
    p.email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
    OR LOWER(s.first_name) IN ('marlee', 'turi')
);

RAISE NOTICE '✅ Deleted coach assignments';

-- Delete swimmers
DELETE FROM swimmers
WHERE parent_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')
)
OR LOWER(first_name) IN ('marlee', 'turi');

RAISE NOTICE '✅ Deleted swimmers';

-- Delete parent profiles (this will cascade to auth.users if configured)
DELETE FROM profiles
WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');

RAISE NOTICE '✅ Deleted parent profiles';

-- Delete auth users (if they exist and profiles didn't cascade)
-- Note: This requires admin privileges
DELETE FROM auth.users
WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');

RAISE NOTICE '✅ Deleted auth users';

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE '✅ CLEANUP COMPLETE';
RAISE NOTICE '============================================================';
RAISE NOTICE '';
RAISE NOTICE '⚠️  IMPORTANT: Review the output above before committing!';
RAISE NOTICE '';
RAISE NOTICE 'To commit changes: COMMIT;';
RAISE NOTICE 'To undo changes: ROLLBACK;';
RAISE NOTICE '';

-- ============================================================
-- UNCOMMIT THE FOLLOWING LINE TO AUTO-COMMIT
-- (Or manually run COMMIT; if verification looks good)
-- ============================================================

-- COMMIT;

-- Leave transaction open for manual review
-- Run COMMIT; if everything looks correct
-- Run ROLLBACK; if you want to undo
