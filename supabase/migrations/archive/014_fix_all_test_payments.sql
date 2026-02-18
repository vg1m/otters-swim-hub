-- Fix All Test Payments That Succeeded on Paystack
-- Use this for localhost testing where webhooks can't reach your app

-- IMPORTANT: Verify on Paystack dashboard that these payments actually succeeded!
-- Go to https://dashboard.paystack.com/#/transactions and check transaction status

BEGIN;

-- Fix Payment 1: b69d4002-3a14-4176-96e0-fc3ba222865e
DO $$
DECLARE
  v_payment_id UUID := 'b69d4002-3a14-4176-96e0-fc3ba222865e';
  v_invoice_id UUID;
  v_parent_id UUID;
  v_swimmer_ids UUID[];
  v_receipt_number TEXT;
BEGIN
  -- Get details
  SELECT i.id, i.parent_id, ARRAY_AGG(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL)
  INTO v_invoice_id, v_parent_id, v_swimmer_ids
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  LEFT JOIN swimmers s ON s.parent_id = i.parent_id
  WHERE p.id = v_payment_id
  GROUP BY i.id, i.parent_id;

  -- Update payment
  UPDATE payments SET 
    status = 'completed',
    paid_at = NOW(),
    payment_channel = 'card',
    callback_data = COALESCE(callback_data, '{}'::jsonb) || jsonb_build_object(
      'manual_fix', true,
      'fixed_at', NOW(),
      'reason', 'Localhost testing - webhook cannot reach local server'
    )
  WHERE id = v_payment_id;

  -- Update invoice
  UPDATE invoices SET status = 'paid', paid_at = NOW()
  WHERE id = v_invoice_id;

  -- Approve swimmers
  UPDATE swimmers SET status = 'approved'
  WHERE id = ANY(v_swimmer_ids) AND status = 'pending';

  -- Generate receipt
  v_receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  INSERT INTO receipts (invoice_id, payment_id, receipt_number, receipt_data, issued_at)
  VALUES (v_invoice_id, v_payment_id, v_receipt_number, 
    jsonb_build_object('invoice_id', v_invoice_id, 'amount', 3500, 'paid_at', NOW()), NOW())
  ON CONFLICT (receipt_number) DO NOTHING;

  RAISE NOTICE '✓ Fixed payment 1: % (Invoice: %, Receipt: %)', v_payment_id, v_invoice_id, v_receipt_number;
END $$;

-- Fix Payment 2: ca3896a7-3365-4561-ba46-0630b7a9f44a
DO $$
DECLARE
  v_payment_id UUID := 'ca3896a7-3365-4561-ba46-0630b7a9f44a';
  v_invoice_id UUID;
  v_parent_id UUID;
  v_swimmer_ids UUID[];
  v_receipt_number TEXT;
BEGIN
  SELECT i.id, i.parent_id, ARRAY_AGG(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL)
  INTO v_invoice_id, v_parent_id, v_swimmer_ids
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  LEFT JOIN swimmers s ON s.parent_id = i.parent_id
  WHERE p.id = v_payment_id
  GROUP BY i.id, i.parent_id;

  UPDATE payments SET 
    status = 'completed', paid_at = NOW(), payment_channel = 'card',
    callback_data = COALESCE(callback_data, '{}'::jsonb) || jsonb_build_object('manual_fix', true, 'fixed_at', NOW())
  WHERE id = v_payment_id;

  UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = v_invoice_id;

  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers SET status = 'approved' WHERE id = ANY(v_swimmer_ids) AND status = 'pending';
  END IF;

  v_receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  INSERT INTO receipts (invoice_id, payment_id, receipt_number, receipt_data, issued_at)
  VALUES (v_invoice_id, v_payment_id, v_receipt_number, 
    jsonb_build_object('invoice_id', v_invoice_id, 'amount', 3500, 'paid_at', NOW()), NOW())
  ON CONFLICT (receipt_number) DO NOTHING;

  RAISE NOTICE '✓ Fixed payment 2: % (Invoice: %, Receipt: %)', v_payment_id, v_invoice_id, v_receipt_number;
END $$;

-- Fix Payment 3: 0e295671-dbcf-4bc8-b1cf-c161bb534a02
DO $$
DECLARE
  v_payment_id UUID := '0e295671-dbcf-4bc8-b1cf-c161bb534a02';
  v_invoice_id UUID;
  v_parent_id UUID;
  v_swimmer_ids UUID[];
  v_receipt_number TEXT;
BEGIN
  SELECT i.id, i.parent_id, ARRAY_AGG(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL)
  INTO v_invoice_id, v_parent_id, v_swimmer_ids
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  LEFT JOIN swimmers s ON s.parent_id = i.parent_id
  WHERE p.id = v_payment_id
  GROUP BY i.id, i.parent_id;

  UPDATE payments SET 
    status = 'completed', paid_at = NOW(), payment_channel = 'card',
    callback_data = COALESCE(callback_data, '{}'::jsonb) || jsonb_build_object('manual_fix', true, 'fixed_at', NOW())
  WHERE id = v_payment_id;

  UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = v_invoice_id;

  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers SET status = 'approved' WHERE id = ANY(v_swimmer_ids) AND status = 'pending';
  END IF;

  v_receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  INSERT INTO receipts (invoice_id, payment_id, receipt_number, receipt_data, issued_at)
  VALUES (v_invoice_id, v_payment_id, v_receipt_number, 
    jsonb_build_object('invoice_id', v_invoice_id, 'amount', 3500, 'paid_at', NOW()), NOW())
  ON CONFLICT (receipt_number) DO NOTHING;

  RAISE NOTICE '✓ Fixed payment 3: % (Invoice: %, Receipt: %)', v_payment_id, v_invoice_id, v_receipt_number;
END $$;

COMMIT;

-- Verify all fixes
SELECT 
  'Summary After Fix' as status,
  COUNT(*) FILTER (WHERE p.status = 'completed') as completed_payments,
  COUNT(*) FILTER (WHERE i.status = 'paid') as paid_invoices,
  COUNT(DISTINCT r.id) as receipts_generated,
  COUNT(*) FILTER (WHERE s.status = 'approved') as approved_swimmers
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
LEFT JOIN receipts r ON r.invoice_id = i.id
LEFT JOIN swimmers s ON s.parent_id = i.parent_id AND s.status = 'approved'
WHERE p.id IN (
  'b69d4002-3a14-4176-96e0-fc3ba222865e',
  'ca3896a7-3365-4561-ba46-0630b7a9f44a',
  '0e295671-dbcf-4bc8-b1cf-c161bb534a02'
);

-- Show receipts
SELECT 
  'Generated Receipts' as info,
  r.receipt_number,
  r.invoice_id,
  i.status as invoice_status,
  p.status as payment_status
FROM receipts r
JOIN invoices i ON i.id = r.invoice_id
JOIN payments p ON p.id = r.payment_id
ORDER BY r.created_at DESC
LIMIT 10;
