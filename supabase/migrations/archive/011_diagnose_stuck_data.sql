-- Diagnostic Query to Find Stuck Payments
-- Run this to see what's actually in the database

-- 1. Check all payments and their status
SELECT 
  'All Payments' as check_type,
  p.id,
  p.paystack_reference,
  p.status as payment_status,
  p.amount,
  p.paid_at,
  p.paystack_authorization_code,
  p.payment_channel,
  i.status as invoice_status,
  i.id as invoice_id
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Check payments that succeeded on Paystack but database not updated
SELECT 
  'Stuck Payments (Paystack succeeded but DB pending)' as issue,
  p.id,
  p.paystack_reference,
  p.status as payment_status,
  p.paystack_authorization_code,
  i.status as invoice_status
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.paystack_reference IS NOT NULL
  AND (
    p.status = 'pending'
    OR i.status IN ('draft', 'issued')
  )
ORDER BY p.created_at DESC;

-- 3. Check if callback_data has webhook confirmation
SELECT 
  'Payment Callback Data' as check_type,
  p.id,
  p.status,
  p.callback_data->'webhook_data'->>'status' as paystack_status,
  p.callback_data->>'processed_at' as processed_at,
  i.status as invoice_status
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.paystack_reference IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Check swimmers status
SELECT 
  'Swimmers Status' as check_type,
  s.id,
  s.first_name,
  s.last_name,
  s.status,
  s.parent_id,
  s.registration_complete,
  s.payment_deferred
FROM swimmers s
ORDER BY s.created_at DESC
LIMIT 10;

-- 5. Check invoices
SELECT 
  'Invoices' as check_type,
  i.id,
  i.status,
  i.total_amount,
  i.parent_id,
  i.paid_at,
  i.transaction_reference
FROM invoices i
ORDER BY i.created_at DESC
LIMIT 10;
