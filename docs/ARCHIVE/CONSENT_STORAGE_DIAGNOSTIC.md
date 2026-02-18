# Consent Storage Diagnostic & Fix

## Problem
No consent records found in the database. Consents should be captured during registration but aren't being saved.

## What Should Happen

### Registration Flow
```
1. User fills out /register form
   ↓
2. User checks consent boxes:
   - ✅ Data accuracy confirmed
   - ✅ Code of conduct agreed
   - ✅ Media consent (optional)
   ↓
3. User clicks "Pay Now" or "Pay Later"
   ↓
4. POST /api/paystack/initialize
   ↓
5. API creates: swimmers, invoice, line_items, consents ✅
   ↓
6. Consent records stored in registration_consents table
```

### Consent Record Structure
```javascript
{
  parent_id: null,  // Linked when user signs up
  swimmer_id: "uuid",
  media_consent: boolean,
  code_of_conduct_consent: boolean,
  data_accuracy_confirmed: boolean,
  consent_text: "Full policy text...",
  ip_address: "xxx.xxx.xxx.xxx",
  user_agent: "Mozilla/5.0...",
  consented_at: "2024-01-01T12:00:00Z"
}
```

## Possible Causes

### 1. Table Doesn't Exist
If migration `007_enhanced_registration.sql` wasn't applied, the `registration_consents` table won't exist.

### 2. RLS Policy Too Restrictive
If service role client isn't being used, RLS might block inserts.

### 3. Missing Required Field
If `consent_text` is `NULL` or missing, insert will fail (NOT NULL constraint).

### 4. Silent Failure
The code currently logs errors but doesn't fail the registration, so errors go unnoticed.

## Diagnostics Added

### Enhanced Logging in API
Updated `/app/api/paystack/initialize/route.js` to log:
- ✅ When consent storage starts
- ✅ Consent values being stored
- ✅ Number of records being inserted
- ✅ Success confirmation with count
- ❌ Detailed error if insert fails (code, message, details, hint)

### Console Output to Expect
```
Preparing to store consent records...
Consent values: { dataAccuracy: true, codeOfConduct: true, mediaConsent: true }
CONSENT_POLICY_TEXT available: true
Inserting consent records: 2
✅ Consent records stored successfully: 2
```

Or if error:
```
❌ Consent storage error: {
  error: {...},
  code: '23502',
  message: 'null value in column "consent_text" violates not-null constraint',
  details: 'Failing row contains ...',
  hint: null
}
```

## Immediate Diagnostic Steps

### Step 1: Verify Table Exists
**Run this SQL in Supabase Dashboard:**

```sql
-- Check if table exists
SELECT 
  'Table exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'registration_consents'
  ) as exists;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registration_consents'
ORDER BY ordinal_position;
```

**Expected Result:**
- Table exists: `true`
- Columns: id, parent_id, swimmer_id, media_consent, code_of_conduct_consent, data_accuracy_confirmed, consent_text, consented_at, ip_address, user_agent, created_at

**If table doesn't exist:**
Run migration `007_enhanced_registration.sql`

### Step 2: Check Existing Consents
```sql
-- Count consent records
SELECT 
  'Total consents' as check_type,
  COUNT(*) as count
FROM registration_consents;

-- Show recent consents
SELECT 
  id,
  parent_id,
  swimmer_id,
  media_consent,
  code_of_conduct_consent,
  data_accuracy_confirmed,
  consented_at
FROM registration_consents
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- If `count = 0`: No consents have been stored (confirms the issue)
- If `count > 0`: Consents exist but aren't showing (linking issue, see previous fix)

### Step 3: Test a New Registration
1. Open browser DevTools Console
2. Go to `/register`
3. Fill out form
4. Check consent boxes
5. Click "Pay Now" or "Pay Later"
6. **Watch server logs** for consent messages

Look for:
- ✅ `Preparing to store consent records...`
- ✅ `✅ Consent records stored successfully: 1`

Or:
- ❌ `❌ Consent storage error: {...}`

### Step 4: Verify with SQL After Registration
```sql
-- Check if consent was just created
SELECT 
  'Latest consent' as check_type,
  rc.*,
  s.first_name || ' ' || s.last_name as swimmer_name
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
ORDER BY rc.created_at DESC
LIMIT 1;
```

## Common Issues & Fixes

### Issue 1: Table Doesn't Exist
**Symptoms:**
- SQL error: `relation "registration_consents" does not exist`
- Console error: `42P01`

**Fix:**
```sql
-- Run migration 007
-- See: supabase/migrations/007_enhanced_registration.sql

CREATE TABLE IF NOT EXISTS registration_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  media_consent BOOLEAN NOT NULL DEFAULT false,
  code_of_conduct_consent BOOLEAN NOT NULL DEFAULT true,
  data_accuracy_confirmed BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE registration_consents ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Admins can manage consents"
  ON registration_consents FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    parent_id = auth.uid()
  );
```

### Issue 2: NULL consent_text
**Symptoms:**
- Console error: `null value in column "consent_text" violates not-null constraint`
- Error code: `23502`

**Fix:**
Verify `CONSENT_POLICY_TEXT` is imported:
```javascript
import { CONSENT_POLICY_TEXT } from '@/lib/constants/consent-policy'
```

If undefined, check `lib/constants/consent-policy.js` exists.

### Issue 3: RLS Blocking Inserts
**Symptoms:**
- Error: `new row violates row-level security policy`
- Error code: `42501`

**Fix:**
Verify using service role client:
```javascript
import { createServiceRoleClient } from '@/lib/supabase/service-role'
const supabase = createServiceRoleClient()  // ✅ Bypasses RLS
```

### Issue 4: Swimmer ID Invalid
**Symptoms:**
- Foreign key violation
- Error code: `23503`

**Fix:**
Ensure swimmers are created before consents:
```javascript
// 1. Create swimmers first
const { data: createdSwimmers } = await supabase
  .from('swimmers')
  .insert(swimmerInserts)
  .select()

// 2. Then create consents using swimmer IDs
const consentRecords = createdSwimmers.map(swimmer => ({
  swimmer_id: swimmer.id,  // ✅ Valid ID
  // ...
}))
```

## Testing After Fix

### Test Case 1: Fresh Registration
1. Clear browser cache/localStorage
2. Go to `/register`
3. Fill out form with:
   - 1 swimmer
   - All required parent info
   - ✅ Check all consent boxes
4. Choose "Pay Later"
5. Submit

**Expected:**
- ✅ Registration success
- ✅ Console logs: `✅ Consent records stored successfully: 1`

**Verify in Database:**
```sql
SELECT COUNT(*) FROM registration_consents;
-- Should increment by 1
```

### Test Case 2: Multiple Swimmers
1. Register with 2 swimmers
2. Submit

**Expected:**
- ✅ Console logs: `✅ Consent records stored successfully: 2`

**Verify:**
```sql
SELECT COUNT(*) FROM registration_consents 
WHERE consented_at > NOW() - INTERVAL '1 minute';
-- Should show 2 records
```

### Test Case 3: View on Settings Page
1. Sign up with same email used for registration
2. Log in
3. Go to `/settings`
4. Scroll to "Consent History"

**Expected:**
- ✅ Consent records visible
- ✅ Swimmer names shown
- ✅ Consent date/time displayed
- ✅ Checkboxes reflect consent status

## Files Modified

1. **`app/api/paystack/initialize/route.js`** - Enhanced consent logging
2. **`supabase/migrations/028_verify_consents_table.sql`** - Diagnostic SQL
3. **`docs/CONSENT_STORAGE_DIAGNOSTIC.md`** - This documentation

## Build Status
✅ Build successful - ready to test!

## Next Steps

1. **Run diagnostic SQL** to check table existence
2. **Test new registration** with enhanced logging
3. **Check server logs** for consent storage messages
4. **Verify in database** that records are created
5. **Report findings** - share console output and SQL results

If consents are now being stored:
- ✅ Run migrations 025, 026, 027 to link existing data
- ✅ Verify on `/settings` page

If consents still aren't being stored:
- Share the exact console error message
- Share SQL diagnostic results
- We'll investigate further based on the error details
