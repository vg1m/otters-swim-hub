-- ============================================================
-- Migration: Fix Infinite Recursion in Profiles RLS Policy
-- ============================================================
-- Issue: "Admins can view all profiles" policy causes infinite recursion
-- Cause: Policy queries profiles table to check if user is admin
-- Solution: Use auth.jwt() to check role directly from token
-- ============================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Recreate policy using the helper function
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles
  FOR SELECT 
  USING (
    id = (SELECT auth.uid()) 
    OR 
    public.is_admin()
  );

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
  'Allows users to view their own profile, and admins to view all profiles. Uses helper function to avoid recursion.';

COMMENT ON FUNCTION public.is_admin() IS 
  'Security definer function to check if current user is admin. Used by RLS policies to avoid infinite recursion.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INFINITE RECURSION FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed Policy:';
  RAISE NOTICE '   - "Admins can view all profiles" - Non-recursive check';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Test Now:';
  RAISE NOTICE '   1. Login as admin';
  RAISE NOTICE '   2. Go to /admin/coaches';
  RAISE NOTICE '   3. Should see coaches without infinite recursion error';
  RAISE NOTICE '';
END $$;
