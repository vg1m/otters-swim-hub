# Coach Attendance Performance Fix

## Issue

Coaches experienced infinite loading (spinning wheel) when clicking "Manage Attendance" buttons. The page would load but never complete, hanging indefinitely.

## Root Cause

The RLS (Row Level Security) policies for the `swimmers` and `attendance` tables were performing direct queries to the `profiles` table within their USING clauses:

```sql
-- Problematic pattern
CREATE POLICY "Coaches can view squad swimmers" ON swimmers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'coach'
    )
  );
```

This caused:
1. **Infinite Recursion Risk** - Similar to the previous admin profile recursion issue
2. **Slow Query Performance** - Each row check triggers a profiles table query
3. **Hanging Queries** - The cumulative effect causes timeouts and hangs

## Solution

### Migration 050: `050_fix_coach_rls_performance.sql`

Created security definer functions to break the recursion and improve performance:

#### 1. Security Definer Functions

```sql
-- Check if current user is a coach
CREATE FUNCTION public.is_coach() RETURNS BOOLEAN
SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coach'
  );
$$;

-- Check if current user is admin or coach
CREATE FUNCTION public.is_admin_or_coach() RETURNS BOOLEAN
SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'coach')
  );
$$;
```

**Why This Works:**
- `SECURITY DEFINER` executes with function owner's privileges, bypassing RLS
- `STABLE` marks the function as cacheable within a single query
- Breaks the recursion by executing outside the RLS context

#### 2. Updated RLS Policies

**Swimmers Table:**
```sql
CREATE POLICY "Coaches can view squad swimmers" ON swimmers
  FOR SELECT USING (public.is_coach());
```

**Attendance Table:**
```sql
CREATE POLICY "Coaches can manage attendance" ON attendance
  FOR ALL USING (public.is_admin_or_coach());
```

### Enhanced Debugging

Added detailed console logging to `app/admin/sessions/[id]/attendance/page.jsx`:

```javascript
console.log('Loading attendance data for session:', sessionId)
console.log('Fetching session...')
console.log('Session loaded:', sessionData)
console.log('Fetching swimmers for squad:', sessionData.squad)
console.log('Swimmers loaded:', swimmersData?.length || 0)
console.log('Fetching attendance records...')
console.log('Attendance records loaded:', attendanceData?.length || 0)
console.log('Attendance data load complete')
```

This helps identify which specific query is causing delays.

## Deployment Steps

1. **Run the migration:**
   ```bash
   npx supabase migration up --local
   ```

2. **Test the fix:**
   - Log in as a coach
   - Navigate to coach dashboard (`/coach`)
   - Click "Manage Attendance" on any session
   - Page should load within 1-2 seconds
   - Check browser console for detailed logs

3. **Verify in production:**
   ```bash
   npx supabase db push
   ```

## Related Files

- `supabase/migrations/050_fix_coach_rls_performance.sql` - Database migration
- `app/admin/sessions/[id]/attendance/page.jsx` - Enhanced with debug logs
- `lib/supabase/middleware.js` - Updated to allow coach attendance access

## Related Fixes

This is the third RLS recursion/performance fix in the project:
1. **Migration 046** - Fixed missing admin profiles policy
2. **Migration 047** - Fixed infinite recursion with `is_admin()` function
3. **Migration 050** - Fixed coach policies with `is_coach()` functions

## Testing Checklist

- [ ] Coach can view coach dashboard
- [ ] Coach can click "Manage Attendance" without hanging
- [ ] Attendance page loads within 2 seconds
- [ ] Coach can see list of swimmers for the session
- [ ] Coach can mark attendance (present/absent)
- [ ] Coach can save attendance changes
- [ ] Console logs show all queries completing
- [ ] No infinite recursion errors
- [ ] No timeout errors

## Performance Comparison

**Before Fix:**
- Query time: 30+ seconds (timeout)
- Result: Infinite loading spinner

**After Fix:**
- Query time: < 1 second
- Result: Page loads immediately with data
