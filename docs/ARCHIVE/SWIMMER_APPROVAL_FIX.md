# Swimmer Approval Fix - Dashboard Not Updating After Payment

## Problem
Test Swimmer 2 was paid successfully, but the dashboard still showed the swimmer as "pending" instead of "approved".

## Root Cause
When paying an existing invoice via the "Pay Now" button (`/api/paystack/pay-invoice`), the payment record is created **WITHOUT** `callback_data`. The swimmer IDs are only stored in `callback_data` during the initial registration flow.

### Code Flow Comparison

**During Registration (works):**
```javascript
// /api/paystack/initialize
payment = {
  invoice_id: xxx,
  callback_data: {
    swimmers: ["swimmer-id-1", "swimmer-id-2"],  // ✅ Present
    parentData: {...},
    ...
  }
}
```

**When paying existing invoice (was broken):**
```javascript
// /api/paystack/pay-invoice
payment = {
  invoice_id: xxx,
  phone_number: xxx,
  amount: xxx,
  status: 'pending',
  // ❌ NO callback_data!
}
```

**Verification/Webhook API:**
```javascript
// Both APIs tried to get swimmers like this:
const swimmerIds = payment.callback_data?.swimmers || []
// Result: [] (empty array) for "Pay Now" payments
// So no swimmers were approved!
```

## Solution Implemented

Enhanced both `/api/paystack/verify` and `/api/paystack/webhook` to find swimmers in two ways:

1. **First, try callback_data** (for registration payments)
2. **If empty, look up by invoice** (for "Pay Now" payments):
   - Get the invoice's `parent_id`
   - Find all pending swimmers for that parent
   - Also check if invoice has a specific `swimmer_id`
   - Approve all found swimmers

### New Code Logic

```javascript
let swimmerIds = payment.callback_data?.swimmers || []

// If no swimmers in callback_data, find them via invoice
if (swimmerIds.length === 0) {
  // Get invoice details
  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('parent_id, swimmer_id')
    .eq('id', payment.invoice_id)
    .single()
  
  if (invoiceData?.parent_id) {
    // Find all pending swimmers for this parent
    const { data: swimmersData } = await supabase
      .from('swimmers')
      .select('id')
      .eq('parent_id', invoiceData.parent_id)
      .eq('status', 'pending')
    
    swimmerIds = swimmersData?.map(s => s.id) || []
  }
  
  // Also check invoice.swimmer_id
  if (invoiceData?.swimmer_id) {
    const { data: specificSwimmer } = await supabase
      .from('swimmers')
      .select('id, status')
      .eq('id', invoiceData.swimmer_id)
      .single()
    
    if (specificSwimmer?.status === 'pending') {
      swimmerIds.push(specificSwimmer.id)
    }
  }
}

// Now approve swimmers (works for both flows)
if (swimmerIds.length > 0) {
  await supabase
    .from('swimmers')
    .update({ status: 'approved' })
    .in('id', swimmerIds)
}
```

## Files Modified

1. `app/api/paystack/verify/route.js` - Added intelligent swimmer lookup
2. `app/api/paystack/webhook/route.js` - Added intelligent swimmer lookup
3. `supabase/migrations/023_diagnose_test_swimmer_2.sql` - Diagnostic queries
4. `supabase/migrations/024_manually_approve_test_swimmer_2.sql` - Manual fix for existing case

## Immediate Fix for Test Swimmer 2

**Run this SQL in Supabase Dashboard:**

```sql
-- Manually approve Test Swimmer 2
UPDATE swimmers
SET status = 'approved'
WHERE first_name = 'Test' 
  AND last_name = 'Swimmer 2'
  AND status = 'pending';

-- Verify the update
SELECT 
  id,
  first_name,
  last_name,
  status,
  parent_id
FROM swimmers
WHERE first_name = 'Test' AND last_name = 'Swimmer 2';
```

After running this:
1. Refresh the dashboard
2. Test Swimmer 2 should now show as approved ✅
3. No longer appear as "pending"

## Testing After Fix

### For New Payments
1. Register a new swimmer with "Pay Later"
2. Log in and go to `/invoices`
3. Click "Pay Now" on the pending invoice
4. Complete Paystack payment
5. After redirect and verification:
   - Invoice should show "paid" ✅
   - Swimmer should be "approved" ✅
   - Dashboard should be updated ✅

### Console Output to Expect
```
[Paystack] Verifying transaction: INV-xxx-123
Payment verified successfully
Updating payment status...
Updating invoice status to paid...
No swimmers in callback_data, looking up by parent_id...
Found 1 pending swimmers for parent via invoice
Approving swimmers: ['swimmer-id-xxx']
Approved 1 swimmers ✅
```

## Why This Fix Works

✅ **Handles both payment flows:**
   - Registration with immediate payment (has callback_data)
   - Pay Later → Pay Now (no callback_data, uses invoice lookup)

✅ **Finds swimmers reliably:**
   - By parent_id (all pending swimmers for parent)
   - By swimmer_id on invoice (specific swimmer)

✅ **Doesn't break existing functionality:**
   - Still uses callback_data when available (faster)
   - Only does lookup as fallback

✅ **Applied to both endpoints:**
   - `/api/paystack/verify` (for localhost and manual verification)
   - `/api/paystack/webhook` (for production webhook processing)

## Build Status
✅ Build successful - ready to deploy and test!

## Next Steps
1. Run the manual SQL to fix Test Swimmer 2 now
2. Deploy updated code to Vercel
3. Test with a fresh "Pay Later" → "Pay Now" flow
4. Verify dashboard updates automatically
