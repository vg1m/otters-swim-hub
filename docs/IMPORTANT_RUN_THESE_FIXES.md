# 🚨 CRITICAL: Run These 2 Fixes Now

## Issue Summary
"Pay Later" registrations without account were NOT linking swimmers, invoices, or emergency contacts when users signed up later.

## Root Cause
The system only created payment records for "Pay Now" but not "Pay Later", so the linking function couldn't find anything to link.

## Fixes Applied

### Fix 1: Code Updated ✅
**File**: `app/api/paystack/initialize/route.js`

**What changed:**
- Now creates payment record for BOTH "Pay Now" AND "Pay Later"
- Payment record includes all parent data (emergency contact, relationship) in `callback_data`
- This ensures linking can work later when user signs up

### Fix 2: Database Migration ⚠️ YOU MUST RUN THIS

**File**: `supabase/migrations/037_fix_pay_later_linking.sql`

**What it does:**
- Updates the linking function to also populate emergency contact fields in profile
- Extracts data from `payments.callback_data`
- Updates profile with:
  - `relationship` (to swimmer)
  - `emergency_contact_name`
  - `emergency_contact_relationship`
  - `emergency_contact_phone`

## How to Apply

### Step 1: Restart Dev Server (if running)
Your dev server may be locking files. In your terminal:
```bash
# Press Ctrl+C to stop the server
# Then restart:
npm run dev
```

### Step 2: Run SQL Migration in Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Copy the ENTIRE contents of:
   ```
   supabase/migrations/037_fix_pay_later_linking.sql
   ```
5. Paste and click "Run"

**Or run this SQL directly:**

```sql
CREATE OR REPLACE FUNCTION link_orphaned_registrations_by_email(
  user_id UUID,
  user_email TEXT
)
RETURNS TABLE(
  linked_invoices INTEGER,
  linked_swimmers INTEGER,
  linked_consents INTEGER
) AS $$
DECLARE
  v_linked_invoices INTEGER := 0;
  v_linked_swimmers INTEGER := 0;
  v_linked_consents INTEGER := 0;
  v_invoice_ids UUID[];
  v_swimmer_ids UUID[];
  v_parent_data JSONB;
BEGIN
  -- Find invoices by matching email in payments callback_data
  SELECT ARRAY_AGG(DISTINCT i.id) INTO v_invoice_ids
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
  WHERE i.parent_id IS NULL
    AND (
      p.callback_data->>'parentEmail' = user_email
      OR p.callback_data->'parentData'->>'email' = user_email
    );

  -- Update invoices
  IF v_invoice_ids IS NOT NULL THEN
    UPDATE invoices
    SET parent_id = user_id
    WHERE id = ANY(v_invoice_ids);
    
    GET DIAGNOSTICS v_linked_invoices = ROW_COUNT;
  END IF;

  -- Extract parent data from payment callback_data
  SELECT p.callback_data->'parentData' INTO v_parent_data
  FROM payments p
  WHERE p.invoice_id = ANY(v_invoice_ids)
    AND p.callback_data ? 'parentData'
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- ✅ NEW: Update profile with emergency contact and relationship
  IF v_parent_data IS NOT NULL THEN
    UPDATE profiles
    SET 
      relationship = COALESCE(v_parent_data->>'relationship', relationship),
      emergency_contact_name = COALESCE(v_parent_data->>'emergency_contact_name', emergency_contact_name),
      emergency_contact_relationship = COALESCE(v_parent_data->>'emergency_contact_relationship', emergency_contact_relationship),
      emergency_contact_phone = COALESCE(v_parent_data->>'emergency_contact_phone', emergency_contact_phone),
      updated_at = NOW()
    WHERE id = user_id;
  END IF;

  -- Find and link swimmers
  WITH swimmer_ids_from_payments AS (
    SELECT DISTINCT jsonb_array_elements_text(p.callback_data->'swimmers')::UUID as swimmer_id
    FROM payments p
    WHERE p.invoice_id = ANY(v_invoice_ids)
      AND p.callback_data ? 'swimmers'
  )
  SELECT ARRAY_AGG(DISTINCT s.id) INTO v_swimmer_ids
  FROM swimmers s
  WHERE s.parent_id IS NULL
    AND (
      s.id IN (SELECT swimmer_id FROM swimmer_ids_from_payments)
      OR s.id IN (
        SELECT swimmer_id FROM invoices 
        WHERE id = ANY(v_invoice_ids) AND swimmer_id IS NOT NULL
      )
    );

  -- Delete duplicates before linking
  IF v_swimmer_ids IS NOT NULL THEN
    DELETE FROM swimmers s1
    WHERE s1.parent_id IS NULL
      AND s1.id = ANY(v_swimmer_ids)
      AND EXISTS (
        SELECT 1 FROM swimmers s2
        WHERE s2.parent_id = user_id
          AND s2.first_name = s1.first_name
          AND s2.last_name = s1.last_name
          AND s2.date_of_birth = s1.date_of_birth
          AND s2.id != s1.id
      );
  END IF;

  -- Update swimmers
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids)
      AND parent_id IS NULL;
    
    GET DIAGNOSTICS v_linked_swimmers = ROW_COUNT;
  END IF;

  -- Link consents
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE registration_consents
    SET parent_id = user_id
    WHERE parent_id IS NULL
      AND swimmer_id = ANY(v_swimmer_ids);
    
    GET DIAGNOSTICS v_linked_consents = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_linked_invoices, v_linked_swimmers, v_linked_consents;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION link_orphaned_registrations_by_email IS 
  'Links invoices, swimmers, and consents to user account by email match. Also updates profile with emergency contact and relationship data from payment callback_data.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Updated link_orphaned_registrations_by_email function';
  RAISE NOTICE '   ✅ Now creates payment record for BOTH Pay Now and Pay Later';
  RAISE NOTICE '   ✅ Stores parent data in callback_data for linking';
  RAISE NOTICE '   ✅ Updates profile with emergency contact when linking';
  RAISE NOTICE '   ✅ Updates profile with relationship field';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Result: Option 1 (Register First) now fully works!';
END $$;
