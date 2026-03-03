-- ============================================================
-- Migration: Fix Admin Ability to View Coach Profiles
-- ============================================================
-- Issue: Admins cannot see coaches in /admin/coaches page
-- Cause: Missing RLS policy for admins to view all profiles
-- This policy existed in 001_initial_schema.sql but was 
-- accidentally omitted from 038_fix_all_db_warnings.sql
-- ============================================================

-- Drop existing policy if it exists (just in case)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the admin view policy
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
  'Allows admins to view all user profiles including coaches and parents. Required for admin/coaches page.';

-- Verification
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  -- Count profiles policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
  AND tablename = 'profiles';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ADMIN COACH VIEW FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policy Created:';
  RAISE NOTICE '   - "Admins can view all profiles" ON profiles';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total profiles RLS policies: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What This Fixes:';
  RAISE NOTICE '   - Admins can now see coaches in /admin/coaches';
  RAISE NOTICE '   - "+New Assignment" button will work';
  RAISE NOTICE '   - Coach list will populate properly';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test Now:';
  RAISE NOTICE '   1. Login as admin';
  RAISE NOTICE '   2. Go to /admin/coaches';
  RAISE NOTICE '   3. Coaches with role="coach" should appear';
  RAISE NOTICE '   4. "+New Assignment" button should be enabled';
  RAISE NOTICE '';
END $$;
