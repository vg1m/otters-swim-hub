-- =============================================================================
-- INVESTOR DEMO RESET — PREVIEW ONLY (no deletes)
-- =============================================================================
-- Run in Supabase SQL Editor before investor_demo_reset.sql.
-- Review all sections; then run the reset script in a fresh query tab.
-- =============================================================================

-- Pathway slugs kept after reset:
-- pups, dev1, dev2, dev3, bronze, silver, gold

SELECT '=== PATHWAY SQUADS (keep) ===' AS section;

SELECT sq.slug, sq.name, sq.is_active, sq.rubrics_enabled, sq.rubric_template_slug
FROM public.squads sq
WHERE sq.slug IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
ORDER BY sq.sort_order, sq.name;

SELECT '=== MISSING PATHWAY SQUADS (must fix before reset) ===' AS section;

SELECT p.slug AS missing_slug
FROM (
  SELECT unnest(ARRAY['pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold']::text[]) AS slug
) p
WHERE NOT EXISTS (SELECT 1 FROM public.squads sq WHERE sq.slug = p.slug);

SELECT '=== CUSTOM SQUADS (will be deleted) ===' AS section;

SELECT sq.id, sq.slug, sq.name, sq.is_active, sq.created_at
FROM public.squads sq
WHERE sq.slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
ORDER BY sq.name;

SELECT '=== ACCOUNTS TO DELETE (auth + profile) ===' AS section;

SELECT 'auth.users' AS source, u.id, u.email, u.created_at
FROM auth.users u
WHERE lower(u.email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com')
UNION ALL
SELECT 'profiles' AS source, pr.id, pr.email, pr.created_at
FROM public.profiles pr
WHERE lower(pr.email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

SELECT '=== RUBRIC DOMAINS ON CUSTOM SLUGS (will be deleted) ===' AS section;

SELECT d.squad_slug, COUNT(*)::bigint AS domain_count
FROM public.rubric_domains d
WHERE d.squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
GROUP BY d.squad_slug
ORDER BY d.squad_slug;

-- -----------------------------------------------------------------------------
-- Row counts to be wiped
-- -----------------------------------------------------------------------------
SELECT '=== ROW COUNTS (transactional wipe) ===' AS section;

SELECT 'meet_registrations' AS table_name, COUNT(*)::bigint AS row_count FROM public.meet_registrations
UNION ALL SELECT 'training_sessions', COUNT(*)::bigint FROM public.training_sessions
UNION ALL SELECT 'attendance', COUNT(*)::bigint FROM public.attendance
UNION ALL SELECT 'swimmer_milestone_ratings', COUNT(*)::bigint FROM public.swimmer_milestone_ratings
UNION ALL SELECT 'swimmer_attitude_ratings', COUNT(*)::bigint FROM public.swimmer_attitude_ratings
UNION ALL SELECT 'swimmer_performances', COUNT(*)::bigint FROM public.swimmer_performances
UNION ALL SELECT 'coach_notes', COUNT(*)::bigint FROM public.coach_notes
UNION ALL SELECT 'coach_assignments', COUNT(*)::bigint FROM public.coach_assignments
UNION ALL SELECT 'registration_consents', COUNT(*)::bigint FROM public.registration_consents
UNION ALL SELECT 'notifications', COUNT(*)::bigint FROM public.notifications
UNION ALL SELECT 'staff_notifications', COUNT(*)::bigint FROM public.staff_notifications
UNION ALL SELECT 'family_account_members', COUNT(*)::bigint FROM public.family_account_members
UNION ALL SELECT 'swimmers', COUNT(*)::bigint FROM public.swimmers
UNION ALL SELECT 'invoices', COUNT(*)::bigint FROM public.invoices
UNION ALL SELECT 'invoice_line_items', COUNT(*)::bigint FROM public.invoice_line_items
UNION ALL SELECT 'payments', COUNT(*)::bigint FROM public.payments
UNION ALL SELECT 'receipts', COUNT(*)::bigint FROM public.receipts
ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- Preserved infrastructure (should be unchanged by reset)
-- -----------------------------------------------------------------------------
SELECT '=== PRESERVED (not deleted by reset) ===' AS section;

SELECT 'facilities (kept)' AS table_name, COUNT(*)::bigint AS row_count FROM public.facilities
UNION ALL SELECT 'facility_schedules (wiped on finalize)', COUNT(*)::bigint FROM public.facility_schedules
UNION ALL SELECT 'facility_schedule_squads (wiped on finalize)', COUNT(*)::bigint FROM public.facility_schedule_squads
UNION ALL SELECT 'meets', COUNT(*)::bigint FROM public.meets
UNION ALL SELECT 'rubric_domains (pathway slugs only)', COUNT(*)::bigint
  FROM public.rubric_domains d
  WHERE d.squad_slug IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
UNION ALL SELECT 'profiles (all roles, before reset)', COUNT(*)::bigint FROM public.profiles
UNION ALL SELECT 'profiles (admin)', COUNT(*)::bigint FROM public.profiles WHERE role = 'admin'
UNION ALL SELECT 'profiles (coach)', COUNT(*)::bigint FROM public.profiles WHERE role = 'coach'
UNION ALL SELECT 'profiles (parent)', COUNT(*)::bigint FROM public.profiles WHERE role = 'parent'
ORDER BY table_name;
