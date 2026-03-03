-- ============================================================
-- Migration: Add Gala Events Opt-In
-- ============================================================
-- Adds opt-in flag for gala events to swimmers table
-- Prepares data model for future gala-specific fees
-- ============================================================

-- Step 1: Add gala_events_opt_in column
ALTER TABLE swimmers
ADD COLUMN gala_events_opt_in BOOLEAN DEFAULT false;

-- Step 2: Add column comment for documentation
COMMENT ON COLUMN swimmers.gala_events_opt_in IS 
'Indicates if swimmer is opted in for gala events. Default: false. Future: will be used for gala-specific fees and payment processing.';

-- Step 3: Create index for filtering by opt-in status
CREATE INDEX idx_swimmers_gala_opt_in 
ON swimmers(gala_events_opt_in) 
WHERE gala_events_opt_in = true;

-- Verification
DO $$
DECLARE
  v_swimmers_count INTEGER;
  v_opted_in_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_swimmers_count FROM swimmers;
  SELECT COUNT(*) INTO v_opted_in_count FROM swimmers WHERE gala_events_opt_in = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ GALA EVENTS OPT-IN MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total swimmers: %', v_swimmers_count;
  RAISE NOTICE '   - Opted in for gala events: %', v_opted_in_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Changes Applied:';
  RAISE NOTICE '   - Added gala_events_opt_in BOOLEAN column';
  RAISE NOTICE '   - Default value: false';
  RAISE NOTICE '   - Index created for opt-in filtering';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Future-Proofing:';
  RAISE NOTICE '   - Data model ready for gala-specific fees';
  RAISE NOTICE '   - Can extend with gala payment states';
  RAISE NOTICE '   - Can add gala event schedules and registrations';
  RAISE NOTICE '';
END $$;
