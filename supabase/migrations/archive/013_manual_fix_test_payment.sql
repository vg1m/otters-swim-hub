-- Manual Fix for Test Payment That Succeeded on Paystack
-- Use this if webhook never fired or was blocked by RLS

-- STEP 1: Find the payment you want to fix
-- Run this first to see your payments
SELECT 
  p.id,
  p.paystack_reference,
  p.status,
  p.amount,
  i.id as invoice_id,
  i.status as invoice_status,
  i.parent_id
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
WHERE p.paystack_reference IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 5;

-- STEP 2: Copy the payment ID from above and replace in the script below
-- Also verify the payment succeeded on Paystack dashboard first!

-- Set the payment ID here (replace with actual ID from Step 1)
DO $$
DECLARE
  v_payment_id UUID := '5a99b496-e0c2-4e9e-8367-150c55ae8fb4'; -- REPLACE THIS with actual payment ID
  v_invoice_id UUID;
  v_parent_id UUID;
  v_amount DECIMAL;
  v_swimmer_ids UUID[];
  v_receipt_number TEXT;
BEGIN
  -- Get invoice and parent details
  SELECT 
    i.id,
    i.parent_id,
    i.total_amount,
    ARRAY_AGG(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL)
  INTO 
    v_invoice_id,
    v_parent_id,
    v_amount,
    v_swimmer_ids
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  LEFT JOIN swimmers s ON s.parent_id = i.parent_id OR s.id = ANY(
    SELECT jsonb_array_elements_text(p.callback_data->'swimmers')::UUID
    FROM payments WHERE id = v_payment_id
  )
  WHERE p.id = v_payment_id
  GROUP BY i.id, i.parent_id, i.total_amount;

  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found: %', v_payment_id;
  END IF;

  RAISE NOTICE 'Fixing payment % for invoice % (parent: %)', 
    v_payment_id, v_invoice_id, v_parent_id;

  -- Update payment to completed
  UPDATE payments
  SET 
    status = 'completed',
    paid_at = NOW(),
    payment_channel = COALESCE(payment_channel, 'card'),
    callback_data = COALESCE(callback_data, '{}'::jsonb) || jsonb_build_object(
      'manual_fix', true,
      'fixed_at', NOW(),
      'reason', 'Webhook never processed or RLS blocked'
    )
  WHERE id = v_payment_id;

  RAISE NOTICE '✓ Payment marked as completed';

  -- Update invoice to paid
  UPDATE invoices
  SET 
    status = 'paid',
    paid_at = NOW(),
    transaction_reference = (
      SELECT paystack_reference FROM payments WHERE id = v_payment_id
    )
  WHERE id = v_invoice_id;

  RAISE NOTICE '✓ Invoice marked as paid';

  -- Approve swimmers
  IF v_swimmer_ids IS NOT NULL AND array_length(v_swimmer_ids, 1) > 0 THEN
    UPDATE swimmers
    SET status = 'approved'
    WHERE id = ANY(v_swimmer_ids)
      AND status = 'pending';

    RAISE NOTICE '✓ Approved % swimmers', array_length(v_swimmer_ids, 1);
  END IF;

  -- Generate receipt
  SELECT 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')
  INTO v_receipt_number;

  INSERT INTO receipts (invoice_id, payment_id, receipt_number, receipt_data, issued_at)
  VALUES (
    v_invoice_id,
    v_payment_id,
    v_receipt_number,
    jsonb_build_object(
      'invoice_id', v_invoice_id,
      'payment_reference', (SELECT paystack_reference FROM payments WHERE id = v_payment_id),
      'amount', v_amount,
      'payment_channel', 'card',
      'paid_at', NOW(),
      'manual_fix', true
    ),
    NOW()
  )
  ON CONFLICT (receipt_number) DO NOTHING;

  RAISE NOTICE '✓ Receipt generated: %', v_receipt_number;

  -- Summary
  RAISE NOTICE '====================================';
  RAISE NOTICE 'FIXED SUCCESSFULLY!';
  RAISE NOTICE 'Payment ID: %', v_payment_id;
  RAISE NOTICE 'Invoice ID: %', v_invoice_id;
  RAISE NOTICE 'Receipt Number: %', v_receipt_number;
  RAISE NOTICE 'Swimmers Approved: %', COALESCE(array_length(v_swimmer_ids, 1), 0);
  RAISE NOTICE '====================================';

END $$;

-- Verify the fix
SELECT 
  'After Fix' as status,
  p.id as payment_id,
  p.status as payment_status,
  i.status as invoice_status,
  COUNT(s.id) as approved_swimmers,
  r.receipt_number
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
LEFT JOIN swimmers s ON s.parent_id = i.parent_id AND s.status = 'approved'
LEFT JOIN receipts r ON r.invoice_id = i.id
WHERE p.paystack_reference IS NOT NULL
GROUP BY p.id, p.status, i.status, r.receipt_number
ORDER BY p.created_at DESC
LIMIT 5;
