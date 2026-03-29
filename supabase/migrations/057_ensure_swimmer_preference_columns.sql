-- Idempotent repair: same columns as 055_swimmer_session_preference.sql
-- Fixes PGRST204 when remote DB skipped 055 or apply was partial (PostgREST schema cache missing columns).

ALTER TABLE public.swimmers
  ADD COLUMN IF NOT EXISTS sessions_per_week TEXT
    CHECK (sessions_per_week IN ('1-2', '1-4', '6', 'drop-in'));

ALTER TABLE public.swimmers
  ADD COLUMN IF NOT EXISTS preferred_payment_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (preferred_payment_type IN ('monthly', 'quarterly'));
