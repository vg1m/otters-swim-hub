# Profile Editing - Troubleshooting Guide

## Issue: Profile Changes Not Saving ("Not provided" still shows after save)

### Root Cause
The most likely cause is that the **database migration hasn't been applied yet**. The new columns (`relationship`, `emergency_contact_name`, `emergency_contact_relationship`, `emergency_contact_phone`) don't exist in your database.

### Solution 1: Apply Migration via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project: https://app.supabase.com
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Open the file: `c:\Users\mwago\OneDrive\Desktop\otters-swim-hub\supabase\migrations\007_enhanced_registration.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify Success**
   - Check for any error messages
   - Go to **Table Editor** > **profiles**
   - Verify these columns exist:
     - `relationship`
     - `emergency_contact_name`
     - `emergency_contact_relationship`
     - `emergency_contact_phone`

### Solution 2: Apply Migration via CLI

```bash
npx supabase db push
```

**Note:** This requires Supabase CLI to be configured with your project.

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open `/settings` page
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Click "Edit Profile"
5. Fill in the fields
6. Click "Save Changes"

**Look for these console messages:**

✅ **Success Case:**
```
Attempting to save profile for user: [user-id]
Data to save: { full_name: "...", phone_number: "...", ... }
Profile updated successfully: [data]
```

❌ **Error Case - Column doesn't exist:**
```
Supabase error: { message: "column does not exist", ... }
Failed to update profile: column "relationship" does not exist
```
**Solution:** Run the migration (see above)

❌ **Error Case - RLS Policy:**
```
Supabase error: { code: "42501", message: "new row violates row-level security policy" }
```
**Solution:** Check RLS policies in Supabase dashboard

### Step 2: Check Network Tab

1. Open DevTools > **Network** tab
2. Filter by **Fetch/XHR**
3. Click "Save Changes"
4. Look for request to `profiles`
5. Check the response

**Successful response (200):**
```json
[
  {
    "id": "...",
    "full_name": "John Doe",
    "relationship": "father",
    ...
  }
]
```

**Error response (400/500):**
Check the error message for specific issue

### Step 3: Verify Database Directly

1. Go to Supabase Dashboard > **Table Editor**
2. Click on **profiles** table
3. Find your user's row
4. Check if the columns exist and have values after saving

---

## Common Issues & Solutions

### Issue 1: Fields Show "Not provided" After Fresh Registration

**Cause:** User registered before migration was applied.

**Solution:**
1. Apply the migration
2. User clicks "Edit Profile"
3. Fill in all fields
4. Save

The fields will now persist.

### Issue 2: Phone Number Validation Error

**Error:** "Please enter a valid Kenyan phone number"

**Valid formats:**
- `0712345678` (starts with 07 or 01)
- `254712345678` (country code without +)
- `+254712345678` (international format)

**Common mistakes:**
- Wrong starting digits (must be 07 or 01)
- Too short/long (must be 10 digits after 0, or 12 after 254)
- Contains spaces or dashes

### Issue 3: Page Doesn't Reload After Save

**Symptom:** Success toast appears but old data still shows

**Cause:** `window.location.reload()` isn't triggering

**Debug:**
```javascript
// Check console for errors after save
// Look for navigation errors
```

**Solution:** Clear browser cache or try hard refresh (Ctrl+Shift+R)

### Issue 4: RLS Policy Blocking Update

**Error in console:**
```
new row violates row-level security policy for table "profiles"
```

**Check RLS Policy:**
```sql
-- This policy should exist in your database
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

**To fix:**
1. Go to Supabase > **Authentication** > **Policies**
2. Find the profiles table
3. Ensure "Users can update own profile" policy exists
4. If not, run `supabase/migrations/001_initial_schema.sql` or `005_fix_rls_recursion.sql`

---

## Testing Checklist

After applying the migration, test the following:

- [ ] Navigate to `/settings`
- [ ] Click "Edit Profile" button appears
- [ ] Click "Edit Profile" - form fields appear
- [ ] All fields are pre-populated with current values (not empty)
- [ ] Try saving with empty fields - validation errors appear
- [ ] Try saving with invalid phone - validation error appears
- [ ] Fill all fields correctly and click "Save Changes"
- [ ] Success toast appears
- [ ] Page reloads automatically
- [ ] Updated values are displayed (not "Not provided")
- [ ] Refresh page manually - values still persist
- [ ] Check Supabase Table Editor - values saved in database

---

## Migration Status Check

### Quick Test: Check if Migration is Applied

Open Supabase SQL Editor and run:

```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN (
    'relationship',
    'emergency_contact_name', 
    'emergency_contact_relationship',
    'emergency_contact_phone'
  );
```

**Expected result:** 4 rows (all 4 column names)

**If 0 rows:** Migration not applied yet - apply it now!

### Check registration_consents Table

```sql
-- Check if consent table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'registration_consents';
```

**Expected result:** 1 row with `registration_consents`

**If 0 rows:** Migration not applied - this is also why you're seeing the 404 error on settings page

---

## Support

If you're still experiencing issues after following these steps:

1. **Share the console error** - Take a screenshot of browser console
2. **Share the network response** - Copy the error response from Network tab
3. **Confirm migration status** - Run the SQL checks above and share results

**Contact:** Provide these details when requesting support.
