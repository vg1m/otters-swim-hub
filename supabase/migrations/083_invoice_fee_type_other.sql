-- One-off invoice line items (transport, hotels, etc.) — not tied to monthly/quarterly billing.

ALTER TABLE public.invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_fee_type_check;

ALTER TABLE public.invoice_line_items
  ADD CONSTRAINT invoice_line_items_fee_type_check
    CHECK (fee_type IN (
      'registration',
      'monthly_training',
      'quarterly_training',
      'drop_in',
      'early_bird_discount',
      'other'
    ));

COMMENT ON CONSTRAINT invoice_line_items_fee_type_check ON public.invoice_line_items IS
  'Line item category. other = one-off / non-recurring charges (transport, hotels, etc.).';
