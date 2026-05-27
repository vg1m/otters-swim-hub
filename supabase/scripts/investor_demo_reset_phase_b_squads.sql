-- =============================================================================
-- INVESTOR DEMO RESET — Phase B only (custom squads)
-- =============================================================================
-- Use when Phase A already ran but squads still include elite, development_*,
-- pups_akhs, newsquad, etc. Keeps ONLY pathway slugs:
--   pups, dev1, dev2, dev3, bronze, silver, gold
--
-- Run investor_demo_reset_PREVIEW.sql first to list custom squads.
-- Then BEGIN → this script → review → COMMIT or ROLLBACK
-- =============================================================================

BEGIN;

-- Safety: do not remove squads if swimmers still exist
DO $$
DECLARE
  v_swimmers bigint;
BEGIN
  SELECT COUNT(*) INTO v_swimmers FROM public.swimmers;
  IF v_swimmers > 0 THEN
    RAISE EXCEPTION 'Aborting: % swimmers still exist. Run full investor_demo_reset.sql first.', v_swimmers;
  END IF;
END $$;

DELETE FROM public.rubric_domains
WHERE squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DELETE FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DO $$
DECLARE
  rec record;
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.squads;
  RAISE NOTICE 'Squads remaining: % (expected 7)', v_count;
  FOR rec IN SELECT slug, name FROM public.squads ORDER BY sort_order, name LOOP
    RAISE NOTICE '  - % (%)', rec.slug, rec.name;
  END LOOP;
  IF v_count <> 7 THEN
    RAISE WARNING 'Squad count is not 7. Review before COMMIT.';
  END IF;
END $$;

-- Run COMMIT; or ROLLBACK; in the next query.
