# Orphaned Registrations Fix

## Problem

When users register and pay **before** creating an account, their data (invoices, swimmers, consents) is created with `parent_id = NULL`. When they later sign up, their new account has no connection to the registration data, resulting in:

- ❌ Empty dashboard (no swimmers)
- ❌ No invoices visible
- ❌ Payment appears lost
- ❌ Registration data orphaned

## Solution

### 1. Automatic Linking on Signup (New Users)

**Database Trigger:** `on_auth_user_created`
- Triggers when a new user signs up
- Calls `handle_new_user()` function
- Automatically links orphaned records by matching email

**How it works:**
```sql
-- When user signs up with email: parent@example.com
-- The trigger searches for:
- Invoices with parent_id=NULL AND callback_data contains parent@example.com
- Swimmers linked to those invoices
- Consent records for those swimmers

-- Then updates:
UPDATE invoices SET parent_id = new_user_id WHERE ...
UPDATE swimmers SET parent_id = new_user_id WHERE ...
UPDATE registration_consents SET parent_id = new_user_id WHERE ...
```

### 2. Automatic Linking on Login (Existing Users)

**Authentication Hook:** `useAuth.js`
- Runs after every login
- Calls `/api/link-registrations`
- Silently links orphaned records in background
- Refreshes profile if data was linked

**When it runs:**
- User logs in
- Profile loads from cache/database
- Background check for orphaned registrations
- If found, links them and refreshes data

### 3. Manual Linking (Fallback)

**API Endpoint:** `POST /api/link-registrations`
- Allows users to manually trigger linking
- Useful if automatic linking fails
- Returns count of linked records

## Files Modified

### Database Migration
- **`supabase/migrations/009_link_orphaned_registrations.sql`**
  - Creates `link_orphaned_registrations_by_email()` function
  - Updates `handle_new_user()` trigger
  - Creates `link_my_orphaned_registrations()` helper

### API Endpoints
- **`app/api/link-registrations/route.js`**
  - New endpoint for manual/automatic linking

### Authentication
- **`hooks/useAuth.js`**
  - Added `linkOrphanedRegistrations()` function
  - Calls API after login
  - Refreshes profile if data was linked

## Usage

### For New Users (Automatic)
1. User registers and pays → Data created with `parent_id = NULL`
2. User signs up with same email → Trigger automatically links data
3. User sees their invoices and swimmers immediately ✅

### For Existing Users (Automatic)
1. User already has account
2. User registers and pays (different flow or before fix)
3. User logs in → Background check links orphaned data
4. Dashboard refreshes with linked data ✅

### For Manual Recovery (If Needed)
```javascript
// User can call this API manually
POST /api/link-registrations
// Returns:
{
  "success": true,
  "linked": {
    "invoices": 1,
    "swimmers": 2,
    "consents": 2
  }
}
```

## Testing

### Test Scenario 1: New User Registration
1. Go to `/register` (not logged in)
2. Fill form and pay
3. Complete payment on Paystack
4. Go to `/signup` and create account with **same email**
5. Login
6. **Expected:** Dashboard shows swimmers and paid invoice ✅

### Test Scenario 2: Existing User with Orphaned Data
1. Have existing account: `user@example.com`
2. Logout
3. Go to `/register` and register swimmers with same email
4. Pay and complete
5. Login with existing account
6. **Expected:** Dashboard shows newly registered swimmers ✅

### Test Scenario 3: Manual Linking
```bash
# Login as user
# Call API manually
curl -X POST http://localhost:3000/api/link-registrations \
  -H "Cookie: your-session-cookie"

# Expected: Returns linked counts
```

## Database Functions

### `link_orphaned_registrations_by_email(user_id, user_email)`
Links all orphaned records for a given email to a user account.

**Returns:**
```sql
(linked_invoices INTEGER, linked_swimmers INTEGER, linked_consents INTEGER)
```

**How it searches:**
- Invoices: `callback_data->>'parentEmail'` or `callback_data->'parentData'->>'email'`
- Swimmers: Linked to found invoices via `payments.callback_data->'swimmers'`
- Consents: Linked to found swimmers via `swimmer_id`

### `link_my_orphaned_registrations()`
User-facing function that links records for the authenticated user.

**Security:** `SECURITY DEFINER` - runs with elevated privileges but only for authenticated user's own email.

## Monitoring

### Check for Orphaned Records (Admins)
```sql
SELECT * FROM orphaned_registrations_summary;

-- Returns:
-- orphaned_invoices | orphaned_swimmers | orphaned_consents | parent_emails
-- 5                | 12                | 12                | {email1, email2, ...}
```

### View Linking Logs
Check server logs for:
```
✅ Linked orphaned registrations: { invoices: 1, swimmers: 2, consents: 2 }
```

Or database notices:
```
NOTICE: Linked orphaned data for user user@example.com: 1 invoices, 2 swimmers, 2 consents
```

## Edge Cases Handled

1. **User registers multiple times before signup**
   - All registrations get linked ✅

2. **User has both orphaned and non-orphaned data**
   - Only NULL parent_id records are updated ✅
   - Existing linked records untouched ✅

3. **Email doesn't match**
   - No linking occurs ✅
   - Data remains orphaned (admin can fix manually)

4. **User signs up before paying**
   - Normal flow, no orphaned data ✅

## Production Deployment

1. **Apply migration:**
   ```bash
   # In Supabase SQL Editor
   -- Run: supabase/migrations/009_link_orphaned_registrations.sql
   ```

2. **Deploy code changes:**
   ```bash
   git add .
   git commit -m "Fix: Link orphaned registrations to user accounts"
   git push origin main
   ```

3. **Verify in production:**
   - Test new user signup after registration
   - Test existing user login
   - Check logs for linking activity

## Rollback (If Needed)

If there are issues, you can disable automatic linking:

```sql
-- Disable trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Restore old handle_new_user function (without linking)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Original version without linking
  INSERT INTO public.profiles (id, full_name, email, phone_number, role)
  VALUES (NEW.id, ...) ...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Future Enhancements

- [ ] Admin dashboard to view/manage orphaned records
- [ ] Email notification when orphaned data is found during login
- [ ] Bulk linking tool for admins
- [ ] More robust matching (phone number, swimmer names, etc.)

---

**Status:** ✅ Implemented and tested
**Last Updated:** February 2026
**Version:** 1.0
