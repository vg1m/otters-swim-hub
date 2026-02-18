# Cache Invalidation Fix - Profile Not Updating After Save

## Problem

**Symptom:** When editing profile information (phone number, etc.) in `/settings`:
- ✅ Save completes successfully (no errors in console)
- ✅ Success toast appears
- ✅ Page reloads
- ❌ **OLD data still displays** instead of the new data

## Root Cause

The application uses a **profile caching system** (`lib/cache/profile-cache.js`) that stores profile data in:
1. **Memory cache** (fast, current session)
2. **localStorage** (persists across page reloads)

### The Flow That Caused the Issue:

```
1. User edits phone number → NEW data
2. Clicks "Save Changes"
3. Data saves to Supabase database ✓
4. Success! Page reloads
5. On reload, useAuth hook loads profile
6. useAuth checks cache FIRST (line 75-76 in hooks/useAuth.js)
7. Finds OLD cached data (from before the save)
8. Displays OLD data to user ❌
9. (Background refresh happens too late)
```

**The problem:** After saving, the cache was **not being invalidated**, so it still contained stale data.

## Solution

Added cache invalidation immediately after successful save, BEFORE page reload:

```javascript
// In app/settings/page.jsx - handleSaveProfile function

// After successful Supabase update:
console.log('✅ Profile updated successfully!')

// CRITICAL: Invalidate the profile cache
profileCache.invalidate(user.id)  // ← This line was added

// Now reload the page
setTimeout(() => {
  window.location.reload()
}, 2000)
```

### What `profileCache.invalidate(user.id)` Does:

1. Clears the **memory cache** for this user
2. Removes the **localStorage entry** for this user
3. Forces a **fresh database fetch** on next load

## Files Modified

1. **`app/settings/page.jsx`**
   - Added import: `import { profileCache } from '@/lib/cache/profile-cache'`
   - Added cache invalidation in `handleSaveProfile` after successful update
   - Added console logs to track the process

## How It Works Now

### New Flow (Fixed):

```
1. User edits phone number → NEW data
2. Clicks "Save Changes"
3. Data saves to Supabase database ✓
4. profileCache.invalidate(user.id) called ✓
5. Memory cache cleared ✓
6. localStorage cache cleared ✓
7. Page reloads
8. useAuth hook loads profile
9. Cache is empty, so it fetches from database ✓
10. Fetches NEW data from Supabase ✓
11. Displays NEW data to user ✓
```

## Testing

### Before Fix:
```
1. Edit phone: 0712345678 → 0723456789
2. Save
3. Page reloads
4. Shows: 0712345678 (OLD) ❌
```

### After Fix:
```
1. Edit phone: 0712345678 → 0723456789
2. Save
3. Console shows: "Invalidating profile cache for user: [id]"
4. Console shows: "Cache invalidated successfully"
5. Page reloads
6. Shows: 0723456789 (NEW) ✓
```

## Related Files

- **Profile Cache:** `lib/cache/profile-cache.js`
- **Auth Hook:** `hooks/useAuth.js`
- **Settings Page:** `app/settings/page.jsx`

## When to Invalidate Cache

Cache should be invalidated whenever profile data is modified:

✅ **When to invalidate:**
- After updating profile fields (name, phone, relationship, emergency contact)
- After admin changes user role or status
- After user changes password/email (if those become editable)

❌ **When NOT to invalidate:**
- After updating consent records (separate table)
- After updating swimmers (separate table, doesn't affect profile)
- After payments or invoices (doesn't affect profile)

## Console Messages to Look For

When saving successfully, you should see:

```
=== SAVE PROFILE STARTED ===
Attempting to save profile for user: [uuid]
Data to save: { full_name: "...", phone_number: "...", ... }
Calling Supabase update...
✅ Profile updated successfully!
Response data: [array with updated profile]
Invalidating profile cache for user: [uuid]
Cache invalidated successfully
Setting timeout for reload...
=== SAVE PROFILE COMPLETED ===
Reloading page now...
```

## Alternative: Force Refresh Instead of Reload

If you want to avoid the full page reload, you could alternatively:

```javascript
// Instead of window.location.reload()
profileCache.invalidate(user.id)
await getProfile(user.id, true)  // Force refresh from useAuth
setIsEditing(false)
// Profile updates in place without reload
```

However, the current implementation uses reload to ensure a completely fresh state.
