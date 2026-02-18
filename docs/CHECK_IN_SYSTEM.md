# Check-In System Documentation

## Overview
The check-in system allows parents to register their swimmers' attendance at training sessions using a simple manual code entry system.

## How It Works

### For Admins
1. **Create Training Session** (`/admin/sessions`)
   - Click "+ Create Session"
   - Fill in session details (date, time, squad, location)
   - System automatically generates a unique 6-character session code (e.g., `K4M8N2`)

2. **Display Check-In Code**
   - Click "View Check-In Code" on any session
   - Large, readable code is displayed
   - Options to:
     - **Copy Code**: Copy to clipboard for sharing via WhatsApp/SMS
     - **Print Code**: Print a formatted page to display at poolside

3. **View Attendance** (`/admin/sessions/[id]/attendance`)
   - Click "View Attendance" on any session
   - See list of all swimmers who checked in
   - Manually mark attendance if needed

### For Parents
1. **Navigate to Check-In** (`/check-in`)
   - From dashboard, click "Check-In" or navigate to check-in page

2. **Select Swimmer**
   - Choose which swimmer is present from dropdown

3. **Enter Session Code**
   - Get the code from poolside display or coach
   - Enter code (case-insensitive)
   - Click "Check In"

4. **Confirmation**
   - Instant confirmation with swimmer name
   - Check-in is timestamped and recorded
   - View recent check-ins at bottom of page

## Technical Details

### Database Schema
- **training_sessions**: Stores session details and `qr_code_token`
- **attendance**: Records check-ins with `session_id`, `swimmer_id`, `checked_in_by`, `check_in_time`

### Session Code Format
- Automatically generated 6-character code
- Format: `A2B3C4` (alphanumeric)
- Characters used: A-Z (except I, O) and 2-9 (excludes 0, 1)
- Why? Prevents confusion (I vs 1, O vs 0)
- Unique per session
- Case-insensitive for user convenience
- Easy to read and type on mobile

### Check-In Validation
- ✅ Validates session code exists
- ✅ Prevents duplicate check-ins
- ✅ Records timestamp
- ✅ Links to swimmer and parent

## Benefits of Manual Code Entry

1. **Simplicity**: No camera permissions, no QR scanning libraries
2. **Reliability**: Works on any device, regardless of camera quality
3. **Flexibility**: Code can be shared via multiple channels (display, WhatsApp, SMS)
4. **Accessibility**: Easy for parents to read and enter manually
5. **Offline-First**: Parents can note the code and enter it later if needed

## User Flow Example

### Admin Morning Routine:
1. Login to `/admin/sessions`
2. View today's sessions
3. Click "View Check-In Code" for first session
4. Click "Print Code"
5. Display printed code at poolside

### Parent Arrival:
1. Swimmer arrives at pool
2. Parent sees code displayed: `K4M8N2`
3. Opens app → Check-In
4. Selects "John Doe" from dropdown
5. Types: `K4M8N2` (only 6 characters!)
6. Taps "Check In"
7. ✅ Confirmation: "John Doe checked in successfully!"

## Future Enhancements (Optional)
- SMS notifications with session code
- Push notifications for upcoming sessions
- Automatic session code sharing via WhatsApp
- Check-in reminders for parents

## Removed Features
- ❌ QR Code scanning (removed for simplicity)
- ❌ Camera-based check-in (removed - unreliable, complex)
- ❌ `qrcode` package (uninstalled)
- ❌ `react-qr-scanner` package (uninstalled)

## Support
Parents needing assistance:
1. Contact coach or admin at poolside
2. Admin can manually mark attendance via dashboard
3. Check recent check-ins on dashboard to verify
