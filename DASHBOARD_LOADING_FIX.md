# Dashboard Loading Timeout Fix

## 🐛 **Problem**

Console error appearing in parent dashboard:
```
Loading timeout - forcing stop
app/dashboard/page.jsx (35:17) @ ParentDashboard.useEffect
```

This error was triggering even when data loaded successfully, causing confusion and false error messages.

## 🔍 **Root Cause**

The loading timeout was incorrectly placed in the `useEffect` hook:

```javascript
useEffect(() => {
  // ❌ WRONG: Timeout created on EVERY useEffect run
  loadingTimeoutRef.current = setTimeout(() => {
    if (loading) {
      console.error('Loading timeout - forcing stop')
      setLoading(false)
      toast.error('Loading took too long. Please refresh the page.')
    }
  }, 10000)
  
  // ... rest of effect
}, [user, profile, authLoading])
```

### Issues:
1. **Multiple timeouts created**: useEffect runs whenever `authLoading`, `user`, or `profile` changes
2. **Stale closures**: Each timeout captures the `loading` state from when it was created
3. **Race conditions**: Old timeouts can fire even after new data loads successfully
4. **False positives**: Timeout triggers even when loading completed properly

## ✅ **Solution**

Moved the timeout INTO the `loadDashboardData` function where it belongs:

```javascript
const loadDashboardData = useCallback(async () => {
  const supabase = createClient()
  setLoading(true)

  // ✅ CORRECT: Timeout created only when actually loading data
  loadingTimeoutRef.current = setTimeout(() => {
    console.error('Loading timeout - data took too long to load')
    setLoading(false)
    toast.error('Loading took too long. Please check your connection and refresh.')
  }, 15000)

  try {
    // ... load data
  } catch (error) {
    // ... handle error
  } finally {
    // ✅ Always cleared when loading completes
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    setLoading(false)
  }
}, [user])
```

### Benefits:
- ✅ **Single timeout**: Only one timeout exists per data load attempt
- ✅ **Proper cleanup**: Cleared in `finally` block when loading completes
- ✅ **Accurate state**: References current loading operation, not stale state
- ✅ **Longer timeout**: Increased from 10s to 15s to be more forgiving
- ✅ **Better message**: More helpful error message for users

## 🆕 **Additional Improvements**

### 1. **Added Coach Redirect**
Coaches were trying to access parent dashboard, now properly redirected:

```javascript
if (profile?.role === 'coach') {
  console.log('Coach user, redirecting to /coach')
  router.push('/coach')
  return
}
```

### 2. **Early Return Error Handling**
If swimmers fail to load, timeout is cleared immediately:

```javascript
if (swimmersResult.error) {
  console.error('Error loading swimmers:', swimmersResult.error)
  setSwimmers([])
  // Clear timeout and stop loading on error
  if (loadingTimeoutRef.current) {
    clearTimeout(loadingTimeoutRef.current)
  }
  setLoading(false)
  return
}
```

## 🧪 **Testing**

### Test 1: Normal Loading (Fast)
1. Login as parent
2. Dashboard should load normally
3. No console errors
4. No timeout warnings
5. Data appears within 1-3 seconds

### Test 2: Slow Connection
1. Throttle network in Chrome DevTools (Slow 3G)
2. Login as parent
3. If loading takes > 15 seconds:
   - Timeout triggers
   - Toast shows: "Loading took too long. Please check your connection and refresh."
   - Loading spinner stops
   - Console shows: "Loading timeout - data took too long to load"

### Test 3: Multiple Navigations
1. Login as parent → Dashboard loads
2. Navigate to Settings → Navigate back to Dashboard
3. No duplicate timeouts
4. No console errors
5. Data reloads cleanly

## 📊 **Before vs After**

### Before:
```
❌ Console: "Loading timeout - forcing stop"
❌ False timeouts even on successful loads
❌ Multiple timeouts stacking up
❌ Confusing user error messages
❌ 10 second timeout (too aggressive)
```

### After:
```
✅ Clean console (no false errors)
✅ Timeout only on actual slow loads
✅ Single timeout per load operation
✅ Clear, actionable error messages
✅ 15 second timeout (more reasonable)
✅ Proper coach user handling
```

## 🎯 **Key Learnings**

1. **Timeout placement matters**: Timeouts should be in the async function, not in useEffect
2. **Cleanup is critical**: Always clear timeouts in finally blocks
3. **Avoid stale closures**: Don't reference state in setTimeout from outer scopes
4. **Single responsibility**: useEffect for routing, loadData for loading
5. **Longer timeouts**: 15s is better than 10s for mobile/slow connections

## ✅ **Files Modified**

- `app/dashboard/page.jsx` - Fixed timeout logic, added coach redirect

## 🚀 **Deployment**

No database changes needed. This is purely a frontend fix.

**Status**: ✅ Fixed and Ready  
**Date**: February 20, 2026
