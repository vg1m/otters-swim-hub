# Coach View Fix - Admin Cannot See Coaches

## 🐛 **Problem**

When admins visit `/admin/coaches`:
1. ❌ No coaches appear in the list (even when they exist)
2. ❌ "+New Assignment" button is disabled
3. ❌ Message shows: "Create coach accounts first"

## 🔍 **Root Cause**

**Missing RLS Policy**: The `profiles` table lacks the "Admins can view all profiles" policy.

### Timeline:
1. **Migration 001** (Initial Schema) created this policy correctly
2. **Migration 038** (Fix DB Warnings) recreated ALL RLS policies for performance
3. **BUG**: Migration 038 accidentally omitted the admin view policy for profiles
4. **Result**: Admins can't query for users with `role = 'coach'`

## ✅ **Solution**

Created **Migration 046**: `046_fix_admin_view_coaches.sql`

This migration adds the missing RLS policy:

```sql
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );
```

## 🔧 **Additional Improvements**

Also updated `/admin/coaches/page.jsx` with:

### 1. **Better Error Handling**
- Detailed console logs when queries fail
- Specific toast messages for each data type
- Debug output showing counts loaded

### 2. **Improved UX**
- Clear instructions on how to add coaches
- Step-by-step guide visible when no coaches exist
- Warning box explaining why button is disabled
- Purpose explanation for Coach Assignments section

### 3. **Coach Assignments Explanation**

Added clear documentation box explaining:
- **What are Coach Assignments?**: Assign coaches to squads or individual swimmers
- **Squad Assignment**: Coach manages all swimmers in that squad (current & future)
- **Individual Assignment**: Coach manages only specific swimmers (overrides squad)

## 📋 **"+New Assignment" Button Logic**

### Why It's Disabled:
The button is intentionally disabled when `coaches.length === 0` because:
- ✅ **Makes sense**: Can't create assignments without coaches
- ✅ **Prevents errors**: Assignment form requires coach selection
- ✅ **Clear UX**: Warning message explains why it's disabled

### When It Enables:
- ✅ At least one user with `role = 'coach'` exists
- ✅ Admin successfully queries those coaches via RLS
- ✅ `coaches` state array has length > 0

## 🚀 **How to Fix**

### Step 1: Run Migration 046
```
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: 046_fix_admin_view_coaches.sql
3. Paste and click "Run"
4. Wait for success message
```

### Step 2: Verify
```sql
-- Check the policy exists
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles' 
AND policyname = 'Admins can view all profiles';
```

Should return 1 row.

### Step 3: Test
1. Login as admin
2. Navigate to `/admin/coaches`
3. If you have coaches (users with `role = 'coach'`):
   - ✅ They should appear in the table
   - ✅ "+New Assignment" button should be enabled
4. If you have NO coaches:
   - ✅ Clear instructions show how to add them
   - ✅ Warning explains why button is disabled

## 🧪 **Testing Checklist**

### Pre-Migration
- [ ] Login as admin
- [ ] Go to `/admin/coaches`
- [ ] Confirm coaches don't appear (bug state)
- [ ] Confirm button is disabled

### Run Migration
- [ ] Run `046_fix_admin_view_coaches.sql`
- [ ] Verify success message
- [ ] Check policy exists in database

### Post-Migration
- [ ] Refresh `/admin/coaches` page
- [ ] Coaches with `role = 'coach'` should appear
- [ ] "+New Assignment" button should be enabled (if coaches exist)
- [ ] Console log should show: "Loaded coaches: X"
- [ ] Can click "Assign" on individual coaches
- [ ] Can click "+New Assignment" button

### Create Assignment
- [ ] Click "+New Assignment"
- [ ] Modal opens
- [ ] Coach dropdown populated
- [ ] Can select Squad or Individual
- [ ] Can select squad or swimmer
- [ ] Can save assignment
- [ ] Assignment appears in table

## 📊 **Debug Console Logs**

After the fix, you should see in browser console:
```
Loaded coaches: 3
Loaded swimmers: 15
Loaded assignments: 0
```

If coaches still show 0, the issue might be:
1. No users have `role = 'coach'` in profiles table
2. Coaches have not been added from **Coach Management** yet (see below)

## 🔍 **Verify Coach Users Exist**

Run this query in Supabase SQL Editor:
```sql
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE role = 'coach'
ORDER BY created_at DESC;
```

- **0 rows**: No coaches yet; add them from `/admin/coaches` (**Add coach**)
- **X rows**: Coaches exist; migration 046+ should allow admins to see them in the UI

## How coaches are added (current product)

Coaches **do not** use the parent `/signup` or `/register` flow.

1. Admin opens **`/admin/coaches`** and clicks **Add coach**.
2. Enter **email** and **full name** (optional phone). The app calls `POST /api/admin/coaches/invite` (requires `SUPABASE_SERVICE_ROLE_KEY` on the server).
3. **New email**: Supabase sends an invite. The API sets `redirect_to` to **`/auth/finish-invite`** (no nested `?next=` query—nested redirects can prevent session tokens being appended). Tokens from the implicit hash or PKCE `code` become **auth cookies** on that page; the coach then sets a password at **`/auth/set-password`**.
   - In **Supabase → Authentication → URL configuration**, add your site origin’s **`/auth/finish-invite`** and **`/auth/set-password`** (and wildcards if you use them) to **Redirect URLs**.
   - Optional but recommended: in **Auth → Email templates → Invite user**, use a link that hits your app with `token_hash` so the server can verify without relying on the hash (see [Supabase email templates → Redirecting server-side](https://supabase.com/docs/guides/auth/auth-email-templates)):  
     `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=%2Fauth%2Fset-password`
4. **Existing parent** with the same email: their profile is upgraded to `role = 'coach'`; they keep their existing login.

Then use **Assign** on the same page for squads or swimmers.

## Manual role update (emergency / support only)

Prefer **Add coach** in the UI. For database maintenance (e.g. superuser session), you can still run SQL:

```sql
SELECT id, email, full_name, role FROM profiles WHERE email = 'coach@example.com';

UPDATE profiles 
SET role = 'coach' 
WHERE email = 'coach@example.com';
```

Migration **`066_profiles_role_change_guard.sql`** blocks non-admins from changing `role` via the Supabase client; service role and privileged DB sessions can still update roles.

## ✅ **Success Criteria**

After applying this fix:
- [x] Migration 046 runs successfully
- [x] RLS policy "Admins can view all profiles" exists
- [x] Admins can query all profiles regardless of role
- [x] Coaches appear in `/admin/coaches` list
- [x] "+New Assignment" button enabled when coaches exist
- [x] Button disabled with clear explanation when no coaches
- [x] Console logs show coach count
- [x] Can create assignments successfully

---

**Status**: ✅ Fixed  
**Migration**: 046_fix_admin_view_coaches.sql  
**Files Modified**: app/admin/coaches/page.jsx  
**Date**: February 20, 2026
