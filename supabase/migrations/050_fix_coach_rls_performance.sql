-- ============================================================
-- Migration: Fix Coach RLS Performance
-- ============================================================
-- Creates security definer function to prevent recursion and
-- improve performance of coach role checks in RLS policies
-- ============================================================

-- Step 1: Create security definer function for coach role check
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'coach'
  );
$$;

-- Step 2: Create security definer function for admin or coach check
CREATE OR REPLACE FUNCTION public.is_admin_or_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  );
$$;

-- Step 3: Update swimmers RLS policy to use security definer function
DROP POLICY IF EXISTS "Coaches can view squad swimmers" ON public.swimmers;
CREATE POLICY "Coaches can view squad swimmers" ON public.swimmers
  FOR SELECT USING (
    public.is_coach()
  );

-- Step 4: Update attendance RLS policy to use security definer function
DROP POLICY IF EXISTS "Coaches can manage attendance" ON public.attendance;
CREATE POLICY "Coaches can manage attendance" ON public.attendance
  FOR ALL USING (
    public.is_admin_or_coach()
  );

-- Step 5: Ensure "Coaches can view assigned swimmers" policy also uses the function
DROP POLICY IF EXISTS "Coaches can view assigned swimmers" ON public.swimmers;
CREATE POLICY "Coaches can view assigned swimmers" ON public.swimmers
  FOR SELECT USING (
    -- Direct assignment via coach_id
    coach_id = (SELECT auth.uid()) 
    OR
    -- Squad assignment via coach_assignments
    id IN (
      SELECT swimmer_id FROM coach_assignments 
      WHERE coach_id = (SELECT auth.uid()) AND swimmer_id IS NOT NULL
    )
    OR
    -- Squad-level assignment (all swimmers in assigned squads)
    squad IN (
      SELECT ca.squad FROM coach_assignments ca
      WHERE ca.coach_id = (SELECT auth.uid()) AND ca.squad IS NOT NULL
    )
    OR
    -- Allow if user is a coach (fallback for general viewing)
    public.is_coach()
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COACH RLS PERFORMANCE FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Changes Applied:';
  RAISE NOTICE '   - Created is_coach() security definer function';
  RAISE NOTICE '   - Created is_admin_or_coach() security definer function';
  RAISE NOTICE '   - Updated swimmers RLS to use functions';
  RAISE NOTICE '   - Updated attendance RLS to use functions';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Benefits:';
  RAISE NOTICE '   - Prevents infinite recursion in role checks';
  RAISE NOTICE '   - Improves query performance';
  RAISE NOTICE '   - Consistent role validation across policies';
  RAISE NOTICE '';
END $$;
