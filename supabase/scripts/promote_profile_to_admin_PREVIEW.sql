-- Preview: profile that will be promoted to admin.
-- 1. Replace the email below.
-- 2. Run in Supabase SQL Editor (read-only).
-- 3. Then run promote_profile_to_admin_run_once.sql

-- >>> SET TARGET EMAIL HERE <<<
-- 'admin@example.com'

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.phone_number,
  EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id) AS has_auth_user
FROM public.profiles p
WHERE lower(trim(p.email)) = lower(trim('admin@example.com'));

-- Expected: exactly one row, has_auth_user = true, role is usually 'parent' or 'coach'.
