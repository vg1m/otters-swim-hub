# Consent History Fix - Blank Consent Records on Settings Page

## Problem
The "Consent History" section on `/settings` page is blank, even though users accepted consents during registration. The section should display:
- Which swimmers the consents are for
- What was consented to (media release, code of conduct, data accuracy)
- When the consent was given
- IP address and user agent (metadata)

## Root Cause
When users register without an account ("Pay Now" or "Pay Later"), consent records are created with `parent_id = NULL`:

```javascript
// app/api/paystack/initialize/route.js (line 126)
const consentRecords = createdSwimmers.map(swimmer => ({
  parent_id: null, // ❌ Will be linked when parent signs up
  swimmer_id: swimmer.id,
  media_consent: consents.mediaConsent,
  // ...
}))
```

### Why Consents Are Orphaned
1. **Registration flow**: Users register swimmers first, then optionally create an account
2. **Orphaned by design**: Records start with `parent_id = NULL` to allow unauthenticated registration
3. **Should be linked**: When user signs up with the same email, the linking function should connect the data

### The Linking Issue
The `link_orphaned_registrations_by_email()` function (in migration `009`) **does** link consents:

```sql
-- Lines 73-80
IF v_swimmer_ids IS NOT NULL THEN
  UPDATE registration_consents
  SET parent_id = user_id
  WHERE parent_id IS NULL
    AND swimmer_id = ANY(v_swimmer_ids);
  
  GET DIAGNOSTICS v_linked_consents = ROW_COUNT;
END IF;
```

**However**, this only works if:
- ✅ The user signs up with the **exact same email** used during registration
- ✅ The linking function is called (triggered on signup or manual API call)
- ✅ The swimmers were already linked first (since consents link via `swimmer_id`)

### RLS Policy
The Row-Level Security policy on `registration_consents` only shows records where:
```sql
parent_id = auth.uid()  -- User can only see their own consents
```

If `parent_id = NULL` (orphaned), the consent is invisible to the user due to RLS, even though it exists in the database.

## Solution

### 1. Manual Fix Migration
Created `supabase/migrations/027_fix_orphaned_consents.sql`:

```sql
-- Link orphaned consents to parents via swimmers
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;
```

This finds all orphaned consents and links them to the parent if their associated swimmer already has a `parent_id`.

### 2. Diagnostic Migration
Created `supabase/migrations/026_diagnose_consents.sql` to help debug:
- Count total consents
- Show recent consents with details
- Check for orphaned consents
- Show consent history by user
- Verify swimmer-consent linkage

## Files Created

1. **`supabase/migrations/026_diagnose_consents.sql`** - Diagnostic queries
2. **`supabase/migrations/027_fix_orphaned_consents.sql`** - Fix orphaned consents
3. **`docs/CONSENT_HISTORY_FIX.md`** - This documentation

## Immediate Fix

### Step 1: Run Diagnostic SQL
**Run this in Supabase Dashboard to check current state:**

```sql
-- Check if there are orphaned consents
SELECT 
  'Orphaned consents' as check_type,
  COUNT(*) as count
FROM registration_consents
WHERE parent_id IS NULL;

-- Check consents for current user (run this while logged in as that user)
SELECT 
  'My consents' as check_type,
  rc.*,
  s.first_name,
  s.last_name
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.parent_id = auth.uid()
ORDER BY rc.consented_at DESC;
```

### Step 2: Run Fix SQL
**Run this to link orphaned consents:**

```sql
-- Link orphaned consents to parents via swimmers
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;

-- Verify the fix
SELECT 
  'Fixed consents' as result,
  COUNT(*) as count
FROM registration_consents
WHERE parent_id IS NOT NULL;

-- Check if any are still orphaned
SELECT 
  'Still orphaned' as result,
  COUNT(*) as count
FROM registration_consents
WHERE parent_id IS NULL;
```

### Step 3: Verify on Settings Page
1. Log in as a user who registered swimmers
2. Go to `/settings`
3. Scroll to "Consent History" section
4. **Expected:** You should now see consent records with:
   - Swimmer name
   - Consent date and time
   - Checkmarks for what was consented to
   - Button to update media consent
   - IP address and user agent in metadata

## Why This Happens

### Normal Registration Flow
```
1. User registers on /register (unauthenticated)
   └─> Creates: swimmers (parent_id=NULL), invoices (parent_id=NULL), consents (parent_id=NULL)

2. User completes payment
   └─> Payment callback_data stores: parentEmail, swimmers IDs

3. User signs up with same email
   └─> Trigger: handle_new_user()
   └─> Calls: link_orphaned_registrations_by_email()
   └─> Links: invoices → swimmers → consents (via parent_id)

4. User logs in and visits /settings
   └─> Queries: registration_consents WHERE parent_id = auth.uid()
   └─> ✅ Shows consent history
```

### What Went Wrong
The linking didn't happen for some users because:
1. **Different email**: User signed up with email A but registered with email B
2. **Linking failed**: Database error during signup prevented linking
3. **Old data**: Consents created before linking function existed
4. **Manual registration**: Admin created account before user signed up

## Prevention

### Future Improvements
1. **Link during payment confirmation**: When payment is verified, also link consents
2. **Better error handling**: Don't silently fail consent linking
3. **Admin tool**: Add UI for admins to manually link orphaned data
4. **Email validation**: Warn users if registration email doesn't match login email

### Verification on Each Deploy
Add this check to your deployment process:

```sql
-- Alert if there are orphaned consents
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING: ' || COUNT(*) || ' orphaned consents found!'
    ELSE '✅ All consents properly linked'
  END as status
FROM registration_consents
WHERE parent_id IS NULL;
```

## Testing After Fix

### Test Case 1: Existing User with Orphaned Consents
1. Run fix SQL migration
2. Log in as user
3. Go to `/settings`
4. **Expected:** Consent history now visible ✅

### Test Case 2: New Registration
1. Register new swimmer on `/register` (not logged in)
2. Choose "Pay Later" or "Pay Now"
3. Complete registration
4. Sign up with the **same email**
5. Log in and go to `/settings`
6. **Expected:** Consent history visible immediately ✅

### Test Case 3: Media Consent Update
1. Go to `/settings` → "Consent History"
2. Find a consent record
3. Click "Update Media Consent"
4. Toggle the checkbox
5. Save
6. **Expected:** Updates successfully and timestamp changes ✅

## Database Schema

### registration_consents Table
```sql
CREATE TABLE registration_consents (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id),     -- Links to parent
  swimmer_id UUID REFERENCES swimmers(id),     -- Links to swimmer
  media_consent BOOLEAN DEFAULT false,         -- Photo/video consent
  code_of_conduct_consent BOOLEAN DEFAULT true,
  data_accuracy_confirmed BOOLEAN DEFAULT true,
  consent_text TEXT NOT NULL,                  -- Full policy text
  consented_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,                             -- For audit trail
  user_agent TEXT,                             -- For audit trail
  created_at TIMESTAMP DEFAULT NOW()
);
```

### RLS Policy
```sql
CREATE POLICY "Admins can manage consents"
  ON registration_consents FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    parent_id = auth.uid()  -- Parents see their own
  );
```

## Build Status
✅ Build successful - ready to deploy!

## Next Steps
1. Run diagnostic SQL to see current state
2. Run fix SQL to link orphaned consents
3. Deploy code to Vercel
4. Test with user accounts
5. Verify consent history displays correctly
