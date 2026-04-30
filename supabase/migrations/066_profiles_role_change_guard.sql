-- Block non-admins from changing profiles.role (self-elevation / tampering).
-- Service role (server) and privileged DB sessions (no JWT user) may still change roles.

CREATE OR REPLACE FUNCTION public.profiles_role_change_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF (auth.jwt() ->> 'role') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only club administrators can change user roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_role_change_guard() IS
  'Rejects profile role changes unless the session is service_role or an admin. Allows maintenance when auth.uid() is null.';

DROP TRIGGER IF EXISTS profiles_role_change_guard ON public.profiles;
CREATE TRIGGER profiles_role_change_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_role_change_guard();
