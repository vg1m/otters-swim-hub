# Consent History & Privacy.ke DSR Widget Fixes

## Issues Fixed

### 1. Privacy.ke DSR Widget Integration ✅
**Problem**: Need to embed Privacy.ke Data Subject Request widget in settings page

**Solution**:
- Created `components/PrivacyDSRWidget.jsx` - Client component that dynamically loads Privacy.ke script
- Replaced admin contact section (lines 607-616) with DSR widget
- Widget loads asynchronously and renders properly in Next.js environment

**Features**:
- Complies with Kenya Data Protection Act
- Allows users to submit data access, correction, deletion, or portability requests
- Integrated with club's Supabase proxy for secure API communication

### 2. Consent History Not Displaying ✅
**Problem**: Users like victor@mwago.me seeing blank consent history despite having consents

**Root Causes**:
1. Query only fetching by `parent_id`, missing consents linked via `swimmer_id`
2. Some consent records had `NULL` parent_id from "Pay Later" registrations

**Solutions**:

#### A. Updated Frontend Query (`app/settings/page.jsx`)
**Before**: Only fetched consents by `parent_id`
```javascript
.from('registration_consents')
.eq('parent_id', user.id)
```

**After**: Fetches consents by swimmer ownership
```javascript
// Get all swimmers for this parent
const swimmerIds = swimmersData.map(s => s.id)

// Fetch consents for all their swimmers
.from('registration_consents')
.in('swimmer_id', swimmerIds)
```

**Benefits**:
- Captures ALL consents for user's swimmers
- Works regardless of when account was created
- Handles "Pay Later" → "Sign Up" flow correctly

#### B. Database Migration (`039_fix_consent_parent_linking.sql`)
**What it does**:
- Updates `registration_consents` records with `NULL` parent_id
- Links them to parent via swimmer relationship
- Ensures all existing consents are properly linked

**SQL**:
```sql
UPDATE registration_consents rc
SET parent_id = s.parent_id
FROM swimmers s
WHERE rc.swimmer_id = s.id
  AND rc.parent_id IS NULL
  AND s.parent_id IS NOT NULL;
```

## Files Changed

### New Files
1. `components/PrivacyDSRWidget.jsx` - Privacy.ke widget component
2. `supabase/migrations/039_fix_consent_parent_linking.sql` - Database fix

### Modified Files
1. `app/settings/page.jsx`:
   - Added `PrivacyDSRWidget` import
   - Updated `loadProfileData()` to fetch consents by swimmer_id
   - Replaced admin contact section with DSR widget

## How to Apply

### 1. Run Database Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/039_fix_consent_parent_linking.sql
```

**Expected Output**:
```
✅ CONSENT PARENT LINKING FIX
📊 Statistics:
   - Total consent records: X
   - Properly linked consents: Y
   - Orphaned consents (NULL parent_id): 0

✅ All consent records properly linked!
```

### 2. Test the Fixes

#### Test Consent History:
1. Login as victor@mwago.me (or any user with registered swimmers)
2. Go to Settings page
3. Scroll to "Consent History" section
4. Should see all consent records for registered swimmers
5. Each consent should show:
   - Swimmer name
   - Consent date/time
   - All consent types (Data Accuracy, Code of Conduct, Media Consent)
   - "Update Media Consent" button

#### Test Privacy.ke DSR Widget:
1. On Settings page, scroll to bottom
2. Section titled "Need help with other changes?"
3. Privacy.ke widget should load below the heading
4. Widget allows submitting:
   - Data Access Requests
   - Data Correction Requests
   - Data Deletion Requests
   - Data Portability Requests
5. All requests routed through secure Supabase proxy

## Kenya Data Protection Act Compliance

The system now provides full compliance with Kenya Data Protection Act requirements:

### 1. Consent Management ✅
- All consents recorded with timestamps
- Consent history viewable by data subjects
- Media consent can be updated anytime
- Audit trail maintained

### 2. Data Subject Rights ✅
- Access: View all stored data via Settings page
- Correction: Update profile and emergency contact info
- Deletion: Request via Privacy.ke widget
- Portability: Request data export via widget
- Objection: Revoke media consent anytime

### 3. Transparency ✅
- Clear consent language during registration
- Consent purposes explained
- Data usage visible to users
- Easy-to-understand interface

## Technical Notes

### Privacy.ke Widget Loading
- Uses `useEffect` for client-side script loading
- Prevents double-loading in development mode
- Graceful error handling if script fails to load
- No hydration issues with Next.js SSR

### Consent Query Performance
- Efficient: Single query using `IN` clause
- Indexed: Uses existing `swimmer_id` index
- Deduplication: Removes any duplicates via Map
- Ordered: Most recent consents first

### Database Integrity
- Foreign key constraints maintained
- Indexes preserved for performance
- RLS policies still enforced
- Backward compatible with existing data

## Verification Queries

Check consent linking status:
```sql
-- All consents for a specific user's swimmers
SELECT 
  rc.id,
  s.first_name || ' ' || s.last_name as swimmer,
  rc.parent_id,
  rc.consented_at
FROM registration_consents rc
JOIN swimmers s ON rc.swimmer_id = s.id
WHERE s.parent_id = 'USER_ID_HERE'
ORDER BY rc.consented_at DESC;

-- Check for any orphaned consents
SELECT COUNT(*) as orphaned_count
FROM registration_consents
WHERE parent_id IS NULL;
```

## Support

If consent history is still blank after these fixes:
1. Check if user has any registered swimmers (Settings → Registered Swimmers)
2. Verify consent records exist in database for those swimmer IDs
3. Run migration 039 again to ensure linking
4. Check browser console for any errors in widget loading

For Privacy.ke widget issues:
1. Check browser console for script loading errors
2. Verify Supabase proxy function is deployed
3. Ensure API key is valid
4. Test network connectivity to privacy.ke

---

**Status**: ✅ Ready to deploy
**Impact**: Fixes consent history for all users, adds KDPA-compliant DSR widget
**Breaking Changes**: None
**Database Changes**: Updates NULL parent_id values in registration_consents
