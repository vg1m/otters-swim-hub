-- Promote an existing user to club administrator (profiles.role = 'admin').
--
-- Prerequisites:
--   - User already exists in Supabase Auth (signed up at least once).
--   - Matching row in public.profiles (created by signup trigger).
--
-- Run in Supabase SQL Editor only. App users cannot change roles (see migration
-- 066_profiles_role_change_guard.sql); SQL Editor / service maintenance is allowed.
--
-- Steps:
--   1. Run promote_profile_to_admin_PREVIEW.sql with the same email.
--   2. Replace the email in BOTH places below.
--   3. Run this script; review the returned row; COMMIT or ROLLBACK.

BEGIN;

-- >>> SET TARGET EMAIL HERE (must match PREVIEW) <<<
-- 'admin@example.com'

UPDATE public.profiles p
SET
  role = 'admin',
  updated_at = NOW()
WHERE lower(trim(p.email)) = lower(trim('admin@example.com'));

-- After update (should show role = admin)
SELECT id, email, full_name, role, updated_at
FROM public.profiles
WHERE lower(trim(email)) = lower(trim('admin@example.com'));

-- If zero rows updated, check email spelling or run PREVIEW script.
-- ROLLBACK;   -- default while testing
-- COMMIT;     -- uncomment when satisfied
