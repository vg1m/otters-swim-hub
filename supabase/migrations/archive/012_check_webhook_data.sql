-- Check if webhook was ever received
SELECT 
  p.id as payment_id,
  p.paystack_reference,
  p.status as payment_status,
  p.amount,
  p.paid_at,
  p.payment_channel,
  p.paystack_authorization_code,
  p.callback_data->>'processed_at' as webhook_processed_at,
  p.callback_data->'webhook_data'->>'status' as paystack_webhook_status,
  p.callback_data->'webhook_data'->>'channel' as paystack_channel,
  i.id as invoice_id,
  i.status as invoice_status,
  i.parent_id
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.paystack_reference IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 5;
