-- Migration: Fix mutable search_path on security definer functions
-- Supabase WARN: function_search_path_mutable
--
-- When a SECURITY DEFINER function runs without a fixed search_path, a
-- malicious user could create a schema object that shadows a built-in and
-- hijack the function's execution context.
-- Fix: add SET search_path = public, pg_temp to each affected function.

-- ============================================================
-- public.is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Security definer function to check if current user is admin. Used by RLS policies to avoid infinite recursion.';

-- ============================================================
-- public.is_coach()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'coach'
  );
$$;

COMMENT ON FUNCTION public.is_coach() IS
  'Security definer function to check if current user is a coach. Used by RLS policies to avoid infinite recursion.';

-- ============================================================
-- public.is_admin_or_coach()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_coach() IS
  'Security definer function to check if current user is an admin or coach. Used by RLS policies to avoid infinite recursion.';
