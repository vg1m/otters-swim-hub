-- Fix infinite recursion in RLS policies
-- The issue: policies were checking the 'role' column which requires reading from profiles table
-- This causes infinite recursion when trying to access profiles

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate policies WITHOUT recursion
-- Simple rule: users can only see and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- For admin access, we'll check role from JWT claims instead of the table
-- This breaks the recursion
CREATE POLICY "Service role can do anything"
  ON profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Fix swimmers policies too (they might have similar issues)
DROP POLICY IF EXISTS "Admins can view all swimmers" ON swimmers;
DROP POLICY IF EXISTS "Coaches can view squad swimmers" ON swimmers;

-- Recreate swimmers policies without recursion
CREATE POLICY "Admins can manage swimmers"
  ON swimmers FOR ALL
  USING (
    -- Check if user has admin role in JWT or is service role
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Fix invoices policies
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    parent_id = auth.uid() OR
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Fix training sessions policies  
DROP POLICY IF EXISTS "Admins can manage training sessions" ON training_sessions;

CREATE POLICY "Admins can manage sessions"
  ON training_sessions FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Fix attendance policies
DROP POLICY IF EXISTS "Coaches can manage attendance" ON attendance;

CREATE POLICY "Coaches can manage attendance"
  ON attendance FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Fix meets policies
DROP POLICY IF EXISTS "Admins can manage meets" ON meets;

CREATE POLICY "Admins can manage meets"
  ON meets FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Fix meet_registrations policies
DROP POLICY IF EXISTS "Admins can manage meet registrations" ON meet_registrations;

CREATE POLICY "Admins can manage meet registrations"
  ON meet_registrations FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM swimmers 
      WHERE swimmers.id = meet_registrations.swimmer_id 
      AND swimmers.parent_id = auth.uid()
    )
  );

-- Verify policies are fixed
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'swimmers', 'invoices')
ORDER BY tablename, policyname;
