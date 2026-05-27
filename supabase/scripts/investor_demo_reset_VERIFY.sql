-- =============================================================================
-- INVESTOR DEMO RESET — VERIFY (run after COMMIT)
-- =============================================================================

WITH pathway AS (
  SELECT unnest(ARRAY['pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold']::text[]) AS slug
),
checks AS (
  SELECT 'swimmers' AS check_name,
    (SELECT COUNT(*)::bigint FROM public.swimmers) AS actual,
    0::bigint AS expected
  UNION ALL
  SELECT 'training_sessions',
    (SELECT COUNT(*)::bigint FROM public.training_sessions),
    0
  UNION ALL
  SELECT 'invoices',
    (SELECT COUNT(*)::bigint FROM public.invoices),
    0
  UNION ALL
  SELECT 'payments',
    (SELECT COUNT(*)::bigint FROM public.payments),
    0
  UNION ALL
  SELECT 'meet_registrations',
    (SELECT COUNT(*)::bigint FROM public.meet_registrations),
    0
  UNION ALL
  SELECT 'squads_total',
    (SELECT COUNT(*)::bigint FROM public.squads),
    7
  UNION ALL
  SELECT 'custom_squads',
    (SELECT COUNT(*)::bigint FROM public.squads WHERE slug NOT IN (SELECT slug FROM pathway)),
    0
  UNION ALL
  SELECT 'missing_pathway_squads',
    (SELECT COUNT(*)::bigint FROM pathway p WHERE NOT EXISTS (
      SELECT 1 FROM public.squads sq WHERE sq.slug = p.slug
    )),
    0
  UNION ALL
  SELECT 'non_pathway_rubric_domains',
    (SELECT COUNT(*)::bigint FROM public.rubric_domains d WHERE d.squad_slug NOT IN (SELECT slug FROM pathway)),
    0
  UNION ALL
  SELECT 'ngonyo_auth_users',
    (SELECT COUNT(*)::bigint FROM auth.users WHERE lower(email) = 'ngonyo.gatahi@gmail.com'),
    0
  UNION ALL
  SELECT 'coachotters_auth_users',
    (SELECT COUNT(*)::bigint FROM auth.users WHERE lower(email) = 'coachotters@gmail.com'),
    0
  UNION ALL
  SELECT 'ngonyo_profiles',
    (SELECT COUNT(*)::bigint FROM public.profiles WHERE lower(email) = 'ngonyo.gatahi@gmail.com'),
    0
  UNION ALL
  SELECT 'coachotters_profiles',
    (SELECT COUNT(*)::bigint FROM public.profiles WHERE lower(email) = 'coachotters@gmail.com'),
    0
)
SELECT
  check_name,
  actual,
  expected,
  CASE WHEN actual = expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM checks
ORDER BY check_name;

SELECT '=== PATHWAY SQUADS ===' AS section;
SELECT slug, name, is_active, rubrics_enabled, rubric_template_slug
FROM public.squads
WHERE slug IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
ORDER BY sort_order, name;

SELECT '=== REMAINING PROFILES BY ROLE ===' AS section;
SELECT role, COUNT(*)::bigint AS count
FROM public.profiles
GROUP BY role
ORDER BY role;

SELECT '=== PRESERVED INFRASTRUCTURE ===' AS section;
SELECT 'facilities' AS table_name, COUNT(*)::bigint AS row_count FROM public.facilities
UNION ALL SELECT 'facility_schedules', COUNT(*)::bigint FROM public.facility_schedules
UNION ALL SELECT 'meets', COUNT(*)::bigint FROM public.meets
ORDER BY table_name;
