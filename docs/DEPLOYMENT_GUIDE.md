# Deployment Guide - Phase 1 Complete

## ✅ What's Been Built

### Admin Features
1. **Facilities Management Page** (`/admin/facilities`)
   - Full CRUD for swimming pools
   - Pool schedules management
   - Lane capacity rules configuration
   
2. **Coach Management Page** (`/admin/coaches`)
   - View all coaches
   - Assign coaches to squads or individual swimmers
   - View coach workload and assignments
   
3. **Enhanced Swimmer Management**
   - Coach assignment dropdown
   - Removed unnecessary fields (sub_squad, license_number, medical_expiry_date)
   
4. **Smart Pool Location in Training Sessions**
   - Pool location dropdown showing all existing facilities
   - "Add New" option to create pools on-the-fly
   - New pools automatically added to facilities database
   - Shows pool details (lanes, length) in dropdown
   
### Parent Features
1. **Full Month Attendance Calendar**
   - Modal with complete month view
   - Color-coded attendance status
   - Navigation between months
   
2. **Recurring Session Display**
   - Recurring badge on parent dashboard
   - Shows recurrence pattern (Weekly, Monthly, etc.)
   
3. **Fixed Pricing Display**
   - Correct squad-specific pricing (7K, 12K, 14K, 27K)
   - Removed incorrect default pricing
   
### Coach Features
1. **Coach Dashboard** (`/coach`)
   - View assigned swimmers
   - View assigned squads
   - View upcoming sessions schedule
   - Quick stats dashboard
   
2. **Coach Assignment System**
   - Hybrid model: Squad-level OR individual swimmer assignments
   - Direct assignment via `swimmers.coach_id`
   - Flexible assignment via `coach_assignments` table

### Navigation
- Role-based navigation for Admin, Parent, and Coach
- Admin sees: Dashboard, Swimmers, Sessions, Coaches, Facilities
- Coach sees: Dashboard only
- Parent sees: Dashboard, Profile

---

## 🗄️ Database Migrations to Run

**IMPORTANT**: Run these migrations in order in your Supabase SQL Editor.

### Migration 044: Coach Fields and Swimmer Cleanup
**File**: `supabase/migrations/044_remove_swimmer_fields_add_coach.sql`

**What it does**:
- Removes `sub_squad`, `license_number`, `medical_expiry_date` from swimmers table
- Adds `coach_id` to swimmers table (for direct assignment)
- Adds `coach_squad` and `coach_schedule` to profiles table
- Creates index on `swimmers.coach_id`

### Migration 045: Coach Assignments System
**File**: `supabase/migrations/045_coach_assignments_system.sql`

**What it does**:
- Creates `coach_assignments` table for flexible coach assignment
- Sets up security policies so coaches can only view their assigned swimmers
- Updates swimmer access control to include coach assignments
- Ensures squad-based and individual assignments work together

### Migration 046: Fix Admin View Coaches ⭐ CRITICAL
**File**: `supabase/migrations/046_fix_admin_view_coaches.sql`

**What it does**:
- Adds missing RLS policy "Admins can view all profiles"
- Fixes bug where admins cannot see coaches in `/admin/coaches`
- Enables the "+New Assignment" button to work
- This policy was accidentally omitted from migration 038

**IMPORTANT**: Without this migration, admins cannot see coaches!

**How to run**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content from `044_remove_swimmer_fields_add_coach.sql`
4. Paste and run
5. Verify success
6. Copy content from `045_coach_assignments_system.sql`
7. Paste and run
8. Verify success
9. Copy content from `046_fix_admin_view_coaches.sql`
10. Paste and run
11. Verify success (coaches should now appear in admin/coaches)

---

## 📁 Files Created

### New Pages
1. `app/admin/facilities/page.jsx` - Full facilities management interface
2. `app/admin/coaches/page.jsx` - Coach assignment management interface
3. `app/coach/page.jsx` - Coach dashboard

### New Components
1. `components/AttendanceCalendarModal.jsx` - Full month attendance calendar

### Modified Files
1. `components/Navigation.jsx` - Updated with coach and admin navigation links
2. `app/dashboard/page.jsx` - Added recurring badge, attendance modal
3. `app/admin/swimmers/page.jsx` - Coach assignment, removed old fields
4. `lib/utils/currency.js` - Fixed pricing (removed non_member entries)
5. `PHASE_1_KANBAN.md` - Client-facing tracker (no technical jargon)

---

## 🔍 How to Access New Features

### As Admin
1. **View Facilities**: Navigate to `/admin/facilities`
   - Add/edit/delete swimming pools
   - Configure pool schedules for each squad
   - Set lane capacity rules

2. **Manage Coaches**: Navigate to `/admin/coaches`
   - View all coaches and their workload
   - Create new assignments (squad or individual)
   - Remove assignments

3. **Assign Coach to Swimmer**: Navigate to `/admin/swimmers`
   - Click "Edit" on any swimmer
   - Use "Assigned Coach" dropdown
   - Save changes

### As Coach
1. **View Dashboard**: Navigate to `/coach`
   - See total swimmers assigned
   - View squads assigned
   - See upcoming sessions
   - View all assigned swimmers

### As Parent
1. **View Full Attendance**: Go to Dashboard (`/dashboard`)
   - Click "View Full Attendance" button on swimmer card
   - See full month calendar with color-coded attendance
   - Navigate between months

2. **See Recurring Sessions**: Go to Dashboard (`/dashboard`)
   - Scroll to "Upcoming Training Sessions"
   - Recurring sessions show a 🔁 badge with pattern

---

## ✅ Pre-Deployment Checklist

### Database
- [ ] Migration 044 run successfully
- [ ] Migration 045 run successfully
- [ ] No errors in Supabase logs

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` set
- [ ] `NEXT_PUBLIC_SITE_URL` set (production URL)

### Vercel Deployment
- [ ] Push all changes to main branch
- [ ] Vercel auto-deploys
- [ ] Check deployment logs for errors
- [ ] Verify build completes successfully

### Post-Deployment Testing
- [ ] Admin can access `/admin/facilities`
- [ ] Admin can access `/admin/coaches`
- [ ] Admin can assign coach in `/admin/swimmers`
- [ ] Coach can access `/coach` dashboard
- [ ] Coach sees only assigned swimmers
- [ ] Parent sees recurring badge on sessions
- [ ] Parent can open attendance calendar modal
- [ ] Pricing displays correctly (7K, 12K, 14K, 27K)

---

## 🧪 Testing Guide

### Test 1: Facilities Management
1. Login as admin
2. Navigate to `/admin/facilities`
3. Add a new facility (e.g., "Test Pool")
4. Add a schedule for this facility
5. Edit the facility details
6. Delete the facility

### Test 2: Coach Assignment
1. Login as admin
2. Navigate to `/admin/coaches`
3. Click "New Assignment"
4. Assign a coach to a squad (e.g., "Competitive")
5. Create another assignment for the same coach to an individual swimmer
6. Verify assignments appear in table

### Test 3: Coach Dashboard
1. Create a coach user account (or use existing)
2. As admin, assign swimmers to this coach
3. Logout and login as the coach
4. Navigate to `/coach`
5. Verify you see only assigned swimmers
6. Verify you see upcoming sessions for assigned squads

### Test 4: Parent Attendance Calendar
1. Login as parent
2. Go to Dashboard
3. Click "View Full Attendance" on a swimmer card
4. Verify modal opens with full month calendar
5. Navigate to previous/next months
6. Verify color coding (attended, missed, upcoming, no session)

### Test 5: Pricing
1. Start new registration at `/register`
2. Fill in swimmer details
3. Select different squads (Pups, Development, All-week)
4. Verify pricing shows:
   - Pups: 7,000 KES
   - Development: 12,000 KES
   - All-week: 14,000 KES
5. Select quarterly option
6. Verify shows 27,000 KES (3 months)

### Test 6: Pool Location Dropdown
1. Login as admin
2. Navigate to `/admin/sessions`
3. Click "Create Session"
4. Open "Pool Location" dropdown
5. Verify you see 3 facilities:
   - Aga Khan Sports Club (6 lanes, 25M)
   - Braeburn School (4 lanes, 25M)
   - Brookhouse School (6 lanes, 50M)
6. Select "Add New Pool Location"
7. Enter a custom pool name (e.g., "Test Pool")
8. Create the session
9. Verify success message includes "New pool location added!"
10. Go to `/admin/facilities`
11. Verify the new pool appears in the facilities list

---

## 🐛 Known Issues / Limitations

### Current Limitations
1. **Coach Sign-up**: Coaches must sign up as regular users, then admin changes role in database
2. **Auto-Assignment**: No automatic coach/facility assignment based on capacity (manual only)
3. **Coach Attendance**: Coaches can view but not yet directly mark attendance from coach dashboard

### Future Enhancements (Phase 2+)
- Admin interface to change user roles (instead of database access)
- Automatic coach assignment based on capacity rules
- Direct attendance marking from coach dashboard
- Coach notes and swimmer progress tracking

---

## 📞 Support

**For Deployment Issues**:
- Check Vercel deployment logs
- Verify environment variables
- Check Supabase migration history

**For Feature Issues**:
- Refer to PHASE_1_KANBAN.md for feature status
- Test with different user roles
- Check browser console for errors

**For Database Issues**:
- Check Supabase logs
- Verify migrations ran successfully
- Check Row-Level Security policies

---

## 🗑️ Demo Data Cleanup

Before going live, remove all test/demo data:

### Option 1: Preview First (Recommended)
1. Run `CLEANUP_demo_data_PREVIEW.sql` to see what will be deleted
2. Review the output carefully
3. Run `CLEANUP_demo_data.sql` (with manual COMMIT)

### Option 2: Direct Cleanup
Run `CLEANUP_demo_data_DIRECT.sql` for immediate deletion

**Detailed guide**: See `DEMO_DATA_CLEANUP_GUIDE.md`

**Data to be removed**:
- Parents: acwzsr@hi2.in, enbcqbfh@hi2.in, gctmzcr@hi2.in
- Swimmers: 'marlee', 'turi'
- All associated: attendance, invoices, registrations, consents

---

## 🎉 Next Steps

1. **Run migrations** (044 and 045)
2. **Clean demo data** (use cleanup scripts above)
3. **Deploy to production** (push to main branch)
4. **Client testing** (follow testing guide above)
5. **Gather feedback** (add to Future Requests if new features)
6. **Sign off Phase 1** (once all testing complete)

---

*Last Updated: February 20, 2026*  
*Phase 1 Development: COMPLETE*  
*Status: Ready for Deployment*
