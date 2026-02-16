# Database Setup Guide

## 🚨 Getting 500 Errors on Signup?

This means your database tables haven't been created yet in Supabase.

## ✅ Complete Setup (5 minutes)

### Step 1: Run Initial Migration (Required)

This creates all 9 tables with Row-Level Security policies.

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `kgarfhqtbbvilqrswwca`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Run Initial Schema**
   - Open file: `supabase/migrations/001_initial_schema.sql`
   - Copy **ALL 383 lines**
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - Wait for: `Success. No rows returned`

**This creates:**
- ✅ profiles table
- ✅ swimmers table
- ✅ invoices table
- ✅ invoice_line_items table
- ✅ payments table
- ✅ training_sessions table
- ✅ attendance table
- ✅ meets table
- ✅ meet_registrations table
- ✅ All RLS policies
- ✅ Database functions

---

### Step 2: Add Auto-Profile Creation (Required)

This automatically creates user profiles when they sign up.

1. **In SQL Editor**
   - Click "+ New query"

2. **Run Trigger Migration**
   - Open file: `supabase/migrations/002_auto_create_profiles.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click "Run"
   - Wait for: `Success. No rows returned`

**This adds:**
- ✅ `handle_new_user()` function
- ✅ Trigger on auth.users table
- ✅ Automatic profile creation

---

### Step 3: Create Your First Admin User

After running migrations, create an admin account:

1. **Sign up normally** at http://localhost:3000/signup
2. **Confirm your email** (check inbox)
3. **Update user role in Supabase:**
   - Go to Supabase Dashboard
   - Click "Table Editor"
   - Select "profiles" table
   - Find your user (by email)
   - Change `role` from `parent` to `admin`
   - Click save

Now you can access admin features at `/admin`

---

## 🧪 Verify Setup

After running both migrations:

### Check Tables Created
1. Supabase Dashboard → Table Editor
2. You should see 9 tables listed
3. Click each to verify structure

### Check Trigger Created
1. Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
3. Should return 1 row

### Test Signup
1. Go to http://localhost:3000/signup
2. Fill in form with new email
3. Submit
4. Should get success message (not 500 error)
5. Check email for confirmation link
6. Verify in Supabase:
   - Auth → Users (user appears)
   - Table Editor → profiles (profile created automatically)

---

## 🐛 Troubleshooting

### Error: "relation profiles does not exist"
**Fix:** Run Step 1 (initial migration) first

### Error: "function handle_new_user() does not exist"
**Fix:** Run Step 2 (trigger migration)

### Still getting 500 errors after migrations
**Fix:** 
1. Check browser console for exact error
2. Check Supabase Dashboard → Logs → Auth logs
3. Verify both migrations completed successfully

### Profile not created after signup
**Fix:**
1. Check if trigger exists (query above)
2. Re-run Step 2 migration
3. Try signing up again with different email

---

## 📋 Migration Files Location

- `supabase/migrations/001_initial_schema.sql` - Main database schema
- `supabase/migrations/002_auto_create_profiles.sql` - Auto-profile trigger

---

## ⚡ Quick Command Reference

Run these queries in SQL Editor to check status:

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Count profiles
SELECT COUNT(*) FROM profiles;

-- See all profiles
SELECT id, email, full_name, role, created_at FROM profiles;
```

---

**After completing these steps, signup should work perfectly!** ✅
