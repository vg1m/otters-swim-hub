-- Migration 062: per-session payment type
--
-- Moves "drop-in / occasional" billing off of `swimmers.sessions_per_week`
-- and onto `swimmers.preferred_payment_type` as a proper third value.
-- Tier (sessions_per_week) is now independent of payment cadence.
--
-- Idempotent and data-safe.

-- 1) Migrate any existing 'drop-in' swimmers to the new model:
--      sessions_per_week = 'drop-in'  ->  '1-2'  (admin can change later)
--      preferred_payment_type         ->  'per_session'
UPDATE public.swimmers
SET
  preferred_payment_type = 'per_session',
  sessions_per_week      = '1-2'
WHERE sessions_per_week = 'drop-in';

-- 2) Drop and re-add CHECK on preferred_payment_type to allow 'per_session'.
ALTER TABLE public.swimmers
  DROP CONSTRAINT IF EXISTS swimmers_preferred_payment_type_check;

ALTER TABLE public.swimmers
  ADD CONSTRAINT swimmers_preferred_payment_type_check
  CHECK (preferred_payment_type IN ('monthly', 'quarterly', 'per_session'));

COMMENT ON COLUMN public.swimmers.preferred_payment_type IS
  'Billing cadence chosen by the parent. monthly / quarterly use squads.monthly_fee / quarterly_fee; per_session is invoiced per attended training at the global per-session rate.';

-- 3) Drop and re-add CHECK on sessions_per_week WITHOUT 'drop-in'.
ALTER TABLE public.swimmers
  DROP CONSTRAINT IF EXISTS swimmers_sessions_per_week_check;

ALTER TABLE public.swimmers
  ADD CONSTRAINT swimmers_sessions_per_week_check
  CHECK (sessions_per_week IN ('1-2', '1-4', '6'));

COMMENT ON COLUMN public.swimmers.sessions_per_week IS
  'Expected training frequency tier. Independent of preferred_payment_type: a per_session swimmer still records an expected tier so coaches and admins know planned attendance.';

-- 4) Neutralise a manually-created "Drop-in" squad if one exists (any common slug),
--    without deleting the row so invoice/audit history stays intact.
UPDATE public.swimmers
SET squad_id = NULL
WHERE squad_id IN (
  SELECT id FROM public.squads
  WHERE slug IN ('drop-in', 'drop_in', 'occasional', 'dropin')
);

UPDATE public.squads
SET is_active = false,
    updated_at = NOW()
WHERE slug IN ('drop-in', 'drop_in', 'occasional', 'dropin');

DO $$
BEGIN
  RAISE NOTICE 'Migration 062 complete. preferred_payment_type now supports per_session; sessions_per_week no longer supports drop-in.';
END $$;
