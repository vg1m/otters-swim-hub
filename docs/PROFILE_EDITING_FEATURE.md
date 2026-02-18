# Editable Profile Fields Feature

## Overview
Users can now update their own profile information (relationship and emergency contact) from the `/settings` page without needing to contact the club admin.

## What Users Can Edit

### ✅ Editable by Users:
1. **Full Name**
2. **Phone Number** (M-Pesa payment contact)
3. **Relationship to Swimmer** (Father, Mother, Guardian, Other)
4. **Emergency Contact Name**
5. **Emergency Contact Relationship**
6. **Emergency Contact Phone Number**

### ❌ Admin-Only (Contact Required):
1. **Email Address** - Tied to authentication system (cannot be changed from settings)
2. **Swimmer Details** - Requires admin approval
3. **Consent Records** - Legal/compliance (except media consent which has its own update flow)

## How It Works

### User Flow:
1. Navigate to **Profile Settings** (`/settings`)
2. Click **"Edit Profile"** button in the Parent/Guardian Information card
3. Update any of the editable fields
4. Fields are validated in real-time
5. Click **"Save Changes"** to persist updates
6. Click **"Cancel"** to discard changes

### Validation Rules:
- **Full Name**: Required, minimum 2 characters
- **Phone Number**: Required, must match Kenyan phone format (`/^(\+254|254|0)[17]\d{8}$/`)
- **Relationship**: Required, must be selected from dropdown
- **Emergency Contact Name**: Required, minimum 2 characters
- **Emergency Contact Relationship**: Required, must be selected from dropdown
- **Emergency Contact Phone**: Required, must match Kenyan phone format (`/^(\+254|254|0)[17]\d{8}$/`)

### Security:
- Uses existing RLS policy: `"Users can update own profile"`
- Users can only update their own profile (enforced by `profiles.id = auth.uid()`)
- Updates are timestamped (`updated_at` field)
- Page reloads after successful save to show fresh data

## Technical Implementation

### Files Modified:

#### 1. `app/settings/page.jsx`
- Added edit mode state management
- Added form validation
- Added save/cancel handlers
- Converted read-only fields to conditional Input/Select components
- Added "Edit Profile" button with save/cancel actions

#### 2. `components/ui/Card.jsx`
- Added optional `action` prop to support header buttons
- Updated header layout to `flex justify-between` for title/action alignment

### Key Functions:

```javascript
handleEditProfile()        // Enters edit mode, initializes form state
handleCancelEdit()         // Exits edit mode, resets to original values
validateProfileUpdate()    // Validates all fields before save
handleSaveProfile()        // Saves to database, shows toast, reloads page
updateEditedField()        // Updates form state for individual fields
```

### Database:
- Uses existing `profiles` table columns:
  - `full_name` (existing column)
  - `phone_number` (existing column)
  - `relationship` (added in migration 007)
  - `emergency_contact_name` (added in migration 007)
  - `emergency_contact_relationship` (added in migration 007)
  - `emergency_contact_phone` (added in migration 007)
  - `updated_at` (auto-updated on save)
- **Important:** Migration `007_enhanced_registration.sql` must be applied for new columns

## Benefits

✅ **Improved UX** - Users can fix mistakes or update info immediately  
✅ **Reduced Admin Workload** - No need to process simple profile updates  
✅ **Payment Flexibility** - Users can update M-Pesa phone number themselves  
✅ **Safety** - Emergency contact can be updated as needed  
✅ **Audit Trail** - All changes tracked via `updated_at` timestamp  
✅ **Maintains Security** - Email (authentication) remains protected  
✅ **Compliance** - Consent management remains with admin for legal reasons  

## Testing Checklist

- [ ] Apply database migration `007_enhanced_registration.sql` (if not already done)
- [ ] Create/login to a parent account
- [ ] Navigate to `/settings`
- [ ] Click "Edit Profile"
- [ ] Try to save with empty fields (should show validation errors)
- [ ] Try invalid phone number (should show validation error)
- [ ] Fill all fields correctly and save
- [ ] Verify toast success message appears
- [ ] Verify page reloads with updated values
- [ ] Verify `updated_at` timestamp in database
- [ ] Verify other users cannot edit this profile (RLS check)

## Future Enhancements (Optional)

1. **Change History Log** - Track what changed and when
2. **Email Notifications** - Notify admin when emergency contact changes
3. **OTP Verification** - Require verification for sensitive changes
4. **Bulk Update** - Update emergency contact for all swimmers at once
5. **Undo Feature** - Ability to revert recent changes
