-- Fix Stuck Payments/Invoices/Swimmers from Previous Tests
-- This manually updates any payments that were completed on Paystack
-- but failed to update in the database due to RLS issues

-- 1. Find and fix completed Paystack payments with pending status
-- (These are payments that succeeded on Paystack but database wasn't updated due to RLS)

DO $$
DECLARE
  v_updated_payments INTEGER := 0;
  v_updated_invoices INTEGER := 0;
  v_updated_swimmers INTEGER := 0;
BEGIN
  -- Update payments that have paystack_authorization_code (means payment succeeded)
  -- but still have 'pending' status
  UPDATE payments
  SET status = 'completed',
      paid_at = COALESCE(paid_at, NOW())
  WHERE status = 'pending'
    AND paystack_authorization_code IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_payments = ROW_COUNT;

  -- Update invoices for completed payments that are still in draft/issued status
  UPDATE invoices i
  SET status = 'paid',
      paid_at = COALESCE(i.paid_at, NOW())
  WHERE i.status IN ('draft', 'issued')
    AND EXISTS (
      SELECT 1 FROM payments p
      WHERE p.invoice_id = i.id
        AND p.status = 'completed'
    );
  
  GET DIAGNOSTICS v_updated_invoices = ROW_COUNT;

  -- Approve swimmers for paid invoices
  UPDATE swimmers s
  SET status = 'approved'
  WHERE s.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.parent_id = s.parent_id
        AND i.status = 'paid'
        AND (
          i.swimmer_id = s.id
          OR s.id IN (
            SELECT jsonb_array_elements_text(p.callback_data->'swimmers')::UUID
            FROM payments p
            WHERE p.invoice_id = i.id
              AND p.callback_data ? 'swimmers'
          )
        )
    );
  
  GET DIAGNOSTICS v_updated_swimmers = ROW_COUNT;

  -- Log results
  RAISE NOTICE 'Fixed stuck records: % payments, % invoices, % swimmers',
    v_updated_payments, v_updated_invoices, v_updated_swimmers;
END $$;

-- 2. Generate missing receipts for paid invoices without receipts
INSERT INTO receipts (invoice_id, payment_id, receipt_number, receipt_data, issued_at)
SELECT 
  i.id as invoice_id,
  p.id as payment_id,
  'REC-' || TO_CHAR(COALESCE(p.paid_at, NOW()), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0') as receipt_number,
  jsonb_build_object(
    'invoice_id', i.id,
    'payment_reference', p.paystack_reference,
    'amount', i.total_amount,
    'payment_channel', p.payment_channel,
    'paid_at', COALESCE(p.paid_at, i.paid_at, NOW())
  ) as receipt_data,
  COALESCE(p.paid_at, i.paid_at, NOW()) as issued_at
FROM invoices i
INNER JOIN payments p ON p.invoice_id = i.id
WHERE i.status = 'paid'
  AND p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM receipts r WHERE r.invoice_id = i.id
  )
ON CONFLICT (receipt_number) DO NOTHING;

-- 3. Verify results
SELECT 
  'Payments fixed' as operation,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
FROM payments;

SELECT 
  'Invoices fixed' as operation,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
  COUNT(*) FILTER (WHERE status = 'issued') as issued_invoices,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices
FROM invoices;

SELECT 
  'Swimmers fixed' as operation,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_swimmers,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_swimmers
FROM swimmers;

SELECT 
  'Receipts generated' as operation,
  COUNT(*) as total_receipts
FROM receipts;
