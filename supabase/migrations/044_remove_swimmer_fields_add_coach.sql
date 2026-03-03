-- Migration: Remove unused swimmer fields and add coach assignment
-- Removes sub_squad, license_number, medical_expiry_date from swimmers table
-- Adds coach_id reference and coach-specific profile fields

-- Remove unused swimmer fields
ALTER TABLE swimmers DROP COLUMN IF EXISTS sub_squad;
ALTER TABLE swimmers DROP COLUMN IF EXISTS license_number;
ALTER TABLE swimmers DROP COLUMN IF EXISTS medical_expiry_date;

-- Add coach assignment to swimmers
ALTER TABLE swimmers ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id);

-- Create index for faster coach lookups
CREATE INDEX IF NOT EXISTS idx_swimmers_coach ON swimmers(coach_id) WHERE coach_id IS NOT NULL;

-- Add coach-specific profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_squad TEXT CHECK (coach_squad IN ('competitive', 'learn_to_swim', 'fitness'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_schedule JSONB;

-- Add comments for documentation
COMMENT ON COLUMN swimmers.coach_id IS 'Coach assigned to this swimmer (manual assignment by admin)';
COMMENT ON COLUMN profiles.coach_squad IS 'Primary squad this coach handles (competitive, learn_to_swim, fitness)';
COMMENT ON COLUMN profiles.coach_schedule IS 'Coach availability schedule as JSON array of {day, start_time, end_time} objects';

-- Verification
DO $$
DECLARE
  v_total_swimmers INTEGER;
  v_assigned_swimmers INTEGER;
  v_total_coaches INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_swimmers FROM swimmers;
  SELECT COUNT(*) INTO v_assigned_swimmers FROM swimmers WHERE coach_id IS NOT NULL;
  SELECT COUNT(*) INTO v_total_coaches FROM profiles WHERE role = 'coach';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SWIMMER FIELDS & COACH SYSTEM UPDATE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Removed Fields:';
  RAISE NOTICE '   - swimmers.sub_squad';
  RAISE NOTICE '   - swimmers.license_number';
  RAISE NOTICE '   - swimmers.medical_expiry_date';
  RAISE NOTICE '';
  RAISE NOTICE '➕ Added Fields:';
  RAISE NOTICE '   - swimmers.coach_id (references profiles)';
  RAISE NOTICE '   - profiles.coach_squad (competitive/learn_to_swim/fitness)';
  RAISE NOTICE '   - profiles.coach_schedule (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total swimmers: %', v_total_swimmers;
  RAISE NOTICE '   - Swimmers with coach: %', v_assigned_swimmers;
  RAISE NOTICE '   - Total coaches: %', v_total_coaches;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Admins can now assign coaches to swimmers manually';
  RAISE NOTICE '';
END $$;

-- Show coach assignment summary
SELECT 
  'Coach Assignment Summary' as status,
  COUNT(*) as total_swimmers,
  COUNT(coach_id) as assigned_to_coach,
  COUNT(*) - COUNT(coach_id) as unassigned
FROM swimmers;
