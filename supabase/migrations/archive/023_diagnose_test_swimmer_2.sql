-- Diagnose Test Swimmer 2 payment and approval issue

-- 1. Check Test Swimmer 2 details
SELECT 
  'Test Swimmer 2 Details' as check_type,
  id,
  first_name,
  last_name,
  status,
  parent_id,
  created_at
FROM swimmers
WHERE first_name = 'Test' AND last_name = 'Swimmer 2';

-- 2. Check the invoice for Test Swimmer 2
SELECT 
  'Invoice for Test Swimmer 2' as check_type,
  i.id as invoice_id,
  i.status as invoice_status,
  i.parent_id,
  i.swimmer_id,
  i.paid_at,
  i.transaction_reference
FROM invoices i
WHERE i.swimmer_id IN (
  SELECT id FROM swimmers WHERE first_name = 'Test' AND last_name = 'Swimmer 2'
)
OR i.parent_id IN (
  SELECT parent_id FROM swimmers 
  WHERE first_name = 'Test' AND last_name = 'Swimmer 2' AND parent_id IS NOT NULL
);

-- 3. Check the payment and callback_data
SELECT 
  'Payment callback_data' as check_type,
  p.id as payment_id,
  p.paystack_reference,
  p.status as payment_status,
  p.paid_at,
  p.callback_data->'swimmers' as swimmer_ids_in_callback,
  p.callback_data->'parentEmail' as parent_email,
  p.invoice_id
FROM payments p
WHERE p.invoice_id IN (
  SELECT i.id FROM invoices i
  WHERE i.swimmer_id IN (
    SELECT id FROM swimmers WHERE first_name = 'Test' AND last_name = 'Swimmer 2'
  )
  OR i.parent_id IN (
    SELECT parent_id FROM swimmers 
    WHERE first_name = 'Test' AND last_name = 'Swimmer 2' AND parent_id IS NOT NULL
  )
)
ORDER BY p.created_at DESC
LIMIT 1;

-- 4. Check if swimmer ID is in the payment's callback_data array
SELECT 
  'Swimmer in callback check' as check_type,
  s.id as swimmer_id,
  s.status as swimmer_status,
  p.callback_data->'swimmers' as callback_swimmer_ids,
  CASE 
    WHEN p.callback_data->'swimmers' @> to_jsonb(ARRAY[s.id]) THEN 'YES - Swimmer ID is in callback_data'
    ELSE 'NO - Swimmer ID NOT in callback_data'
  END as is_in_callback
FROM swimmers s
LEFT JOIN invoices i ON i.swimmer_id = s.id OR i.parent_id = s.parent_id
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE s.first_name = 'Test' AND s.last_name = 'Swimmer 2'
ORDER BY p.created_at DESC
LIMIT 1;
