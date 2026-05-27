-- Coaches with a live auth account (excludes orphan profiles after auth user deletion).

CREATE OR REPLACE FUNCTION public.list_assignable_coaches()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  per_session_rate_kes NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT p.id, p.full_name, p.email, p.per_session_rate_kes
  FROM public.profiles p
  WHERE p.role = 'coach'
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  ORDER BY p.full_name NULLS LAST, p.email;
$$;

COMMENT ON FUNCTION public.list_assignable_coaches() IS
  'Active coach profiles linked to auth.users — for session lead coach dropdown.';

REVOKE EXECUTE ON FUNCTION public.list_assignable_coaches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_assignable_coaches() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_assignable_coaches() TO authenticated;
