# RLS Policy Fix for Signup

## Issue
When users sign up, they get a 401 Unauthorized error when trying to create their profile:
```
POST https://kgarfhqtbbvilqrswwca.supabase.co/rest/v1/profiles 401 (Unauthorized)
```

## Root Cause
The `profiles` table had RLS policies for SELECT and UPDATE, but was missing the INSERT policy. This prevented new users from creating their profile during signup.

## Solution
Added a new RLS policy to allow users to insert their own profile:

```sql
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## How to Apply

### Option 1: Run SQL in Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/002_fix_profiles_insert.sql`
3. Click "Run"

### Option 2: Use Alternative Signup Approach (Supabase Trigger)
Instead of manually inserting profiles, you can use a Supabase database trigger to automatically create profiles when a user signs up. This is more reliable and doesn't require RLS INSERT policy.

**Create this trigger in Supabase SQL Editor:**

```sql
-- Function to create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    'parent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

With this trigger approach, you can simplify your signup code to only call `signUp()` without manually inserting into profiles.

## Recommended Approach
Use the **Supabase Trigger** (Option 2) as it's more secure and automatic. The profile is created server-side by Supabase when a user is created in Auth.

## After Applying Fix
1. Restart your Next.js dev server
2. Try signing up again
3. Check Supabase Dashboard → Authentication → Users to verify user was created
4. Check Database → profiles table to confirm profile was created

## Status
- ✅ Migration file created: `002_fix_profiles_insert.sql`
- ⏳ Needs to be run in Supabase Dashboard
- ⏳ Or implement trigger-based approach (recommended)
