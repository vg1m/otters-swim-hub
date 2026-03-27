-- Swimmer session preference: stores parent's frequency choice and payment type
-- sessions_per_week drives fee tier display and invoice creation
-- preferred_payment_type controls monthly vs quarterly billing

ALTER TABLE public.swimmers
  ADD COLUMN IF NOT EXISTS sessions_per_week TEXT
    CHECK (sessions_per_week IN ('1-2', '1-4', '6', 'drop-in'));

ALTER TABLE public.swimmers
  ADD COLUMN IF NOT EXISTS preferred_payment_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (preferred_payment_type IN ('monthly', 'quarterly'));

COMMENT ON COLUMN public.swimmers.sessions_per_week IS
  'Parent-selected training frequency: 1-2, 1-4, 6 days/week, or drop-in (per-session billing)';

COMMENT ON COLUMN public.swimmers.preferred_payment_type IS
  'Monthly or quarterly billing preference (ignored for drop-in swimmers)';

-- Extend invoice_line_items fee_type to include early_bird_discount
-- drop_in already exists from migration 041
ALTER TABLE public.invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_fee_type_check;

ALTER TABLE public.invoice_line_items
  ADD CONSTRAINT invoice_line_items_fee_type_check
    CHECK (fee_type IN (
      'registration',
      'monthly_training',
      'quarterly_training',
      'drop_in',
      'early_bird_discount'
    ));
