-- =============================================================================
-- INVESTOR DEMO RESET — STATUS (read-only, run anytime)
-- =============================================================================
-- Use when Supabase SQL Editor hides NOTICE messages. Shows results in the grid.
-- =============================================================================

SELECT 'counts' AS section, 'swimmers' AS metric, COUNT(*)::bigint AS actual, 0::bigint AS expected
FROM public.swimmers
UNION ALL
SELECT 'counts', 'training_sessions', COUNT(*)::bigint, 0 FROM public.training_sessions
UNION ALL
SELECT 'counts', 'invoices', COUNT(*)::bigint, 0 FROM public.invoices
UNION ALL
SELECT 'counts', 'squads', COUNT(*)::bigint, 7 FROM public.squads
UNION ALL
SELECT 'counts', 'custom_squads', COUNT(*)::bigint, 0
FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
UNION ALL
SELECT 'counts', 'ngonyo_profiles', COUNT(*)::bigint, 0
FROM public.profiles WHERE lower(email) = 'ngonyo.gatahi@gmail.com'
UNION ALL
SELECT 'counts', 'coachotters_profiles', COUNT(*)::bigint, 0
FROM public.profiles WHERE lower(email) = 'coachotters@gmail.com'
UNION ALL
SELECT 'counts', 'facility_schedules', COUNT(*)::bigint, 0 FROM public.facility_schedules
UNION ALL
SELECT 'counts', 'facility_schedule_squads', COUNT(*)::bigint, 0 FROM public.facility_schedule_squads
ORDER BY metric;

SELECT slug, name FROM public.squads ORDER BY sort_order, name;
