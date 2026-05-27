-- Remove orphan / demo coach profiles so they no longer appear in session coach dropdowns.
-- Run in Supabase SQL Editor. Review counts before COMMIT.

BEGIN;

-- Clear session lead references to coaches being removed
UPDATE public.training_sessions ts
SET coach_id = NULL
WHERE ts.coach_id IN (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'coach'
    AND (
      lower(trim(p.email)) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com')
      OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
    )
);

DELETE FROM public.coach_assignments ca
WHERE ca.coach_id IN (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'coach'
    AND (
      lower(trim(p.email)) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com')
      OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
    )
);

UPDATE public.swimmers s
SET coach_id = NULL
WHERE s.coach_id IN (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'coach'
    AND (
      lower(trim(p.email)) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com')
      OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
    )
);

DELETE FROM public.profiles p
WHERE p.role = 'coach'
  AND (
    lower(trim(p.email)) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com')
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  );

-- Orphan auth users for demo emails (if profile already gone)
DELETE FROM auth.users
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

SELECT 'remaining_coach_profiles' AS check_name, COUNT(*)::bigint AS value
FROM public.profiles WHERE role = 'coach';

-- COMMIT;
