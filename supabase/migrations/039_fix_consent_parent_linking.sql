-- Migration: Fix consent records missing parent_id
-- Updates registration_consents to link parent_id from swimmers table

-- Update consent records where parent_id is NULL but swimmer has a parent
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;

-- Verification query
DO $$
DECLARE
  v_updated_count INTEGER;
  v_null_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- Count updated records
  SELECT COUNT(*) INTO v_updated_count
  FROM registration_consents rc
  JOIN swimmers s ON rc.swimmer_id = s.id
  WHERE rc.parent_id = s.parent_id;

  -- Count remaining NULL parent_id consents
  SELECT COUNT(*) INTO v_null_count
  FROM registration_consents
  WHERE parent_id IS NULL;

  -- Count total consents
  SELECT COUNT(*) INTO v_total_count
  FROM registration_consents;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONSENT PARENT LINKING FIX';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total consent records: %', v_total_count;
  RAISE NOTICE '   - Properly linked consents: %', v_updated_count;
  RAISE NOTICE '   - Orphaned consents (NULL parent_id): %', v_null_count;
  RAISE NOTICE '';
  
  IF v_null_count > 0 THEN
    RAISE NOTICE '⚠️  Warning: % consent records still have NULL parent_id', v_null_count;
    RAISE NOTICE '   These may be from registrations not yet linked to accounts.';
  ELSE
    RAISE NOTICE '✅ All consent records properly linked!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Consent history should now display correctly for all users';
  RAISE NOTICE '';
END $$;

-- Show sample of fixed consents (if any)
SELECT 
  'Fixed Consents Sample' as status,
  rc.id as consent_id,
  s.first_name || ' ' || s.last_name as swimmer_name,
  rc.parent_id,
  rc.consented_at
FROM registration_consents rc
JOIN swimmers s ON rc.swimmer_id = s.id
WHERE rc.parent_id IS NOT NULL
ORDER BY rc.consented_at DESC
LIMIT 5;
