# Admin User Journey

A comprehensive guide for Otters Kenya Academy of Swimming Limited administrators and coaches.

## 🔐 Getting Started

### 1. Admin Account Setup
Your admin account is created by the system administrator with:
- **Role**: `admin` or `coach`
- **Permissions**: Full access to admin dashboard
- **Initial Login**: Use credentials provided by system admin

### 2. First Login
1. Navigate to `/login`
2. Enter admin email and password
3. Automatically redirected to `/admin` dashboard

## 📊 Admin Dashboard Overview

### Main Sections
```
┌────────────────────────────────────┐
│  ADMIN DASHBOARD                   │
├────────────────────────────────────┤
│  📋 Pending Registrations     (12) │
│  🏊 Active Swimmers           (45) │
│  💰 Payment Status                 │
│  📅 Upcoming Sessions         (3)  │
│  📈 Quick Stats                    │
└────────────────────────────────────┘
```

## 👥 Managing Registrations

### 3. View Pending Registrations
**Path**: `/admin/registrations`

**What you see:**
- New swimmer registrations awaiting approval
- Payment status for each
- Parent/guardian contact details
- Registration date

**Actions available:**
- ✅ **Approve** - Manually approve (if payment verified offline)
- ❌ **Reject** - Reject registration with reason
- 👁️ **View Details** - See full registration information
- 📧 **Contact Parent** - Email/phone details provided

### 4. Approve Swimmers
**Auto-Approval:**
- Swimmers who pay via Paystack are **automatically approved**
- No manual action needed

**Manual Approval:**
1. Verify payment received offline (cash/bank transfer)
2. Click "Approve" next to swimmer name
3. Status changes from "Pending" → "Approved"
4. Parent notified (future feature: email notification)

## 💰 Managing Payments & Invoices

### 5. View All Invoices
**Path**: `/admin/invoices`

**Filter by:**
- Status (Paid/Pending/Overdue)
- Date range
- Parent name
- Swimmer name

**Invoice details shown:**
- Invoice number
- Parent details
- Swimmer(s) registered
- Amount (KES 3,000 per swimmer)
- Payment status
- Transaction reference (for paid invoices)
- Payment date and method

### 6. Track Payments
**Payment Sources:**
1. **Paystack** (Card/Mobile/Bank) - Auto-recorded
2. **Cash** - Mark manually as paid
3. **Bank Transfer** - Verify and mark as paid

**To mark manual payment:**
1. Find invoice in list
2. Click "Mark as Paid"
3. Enter transaction reference/receipt number
4. Save
5. Swimmer automatically approved

## 🏊 Managing Swimmers

### 7. View All Swimmers
**Path**: `/admin/swimmers`

**Information displayed:**
- Full name
- Date of birth
- Squad (Competitive/Learn to Swim/Fitness)
- Registration status (Approved/Pending)
- Parent/guardian name and contact
- Medical conditions (if any)
- Emergency contact details
- Registration date

**Actions:**
- 📝 **Edit Details** - Update swimmer information
- 🔄 **Change Squad** - Move to different training group
- ❌ **Deactivate** - Remove from active roster (keeps records)
- 📧 **Contact Parent** - Quick access to parent email/phone

### 8. Filter & Search
- Search by name, squad, status
- Export to CSV for reports
- View by squad for training organization

## 📅 Training Sessions

### 9. Create Training Session
**Path**: `/admin/sessions`

1. Click "+ Create Session"
2. Fill in details:
   - **Date**: Pick from calendar
   - **Time**: Start and end time
   - **Squad**: Select target group
   - **Location**: Pool location/lane assignment
3. Click "Create"
4. **Session code automatically generated** (e.g., `K4M8N2`)

**Session Code:**
- 6-character alphanumeric code
- Unique per session
- Used for swimmer check-in

### 10. Display Check-In Code
1. Find session in list
2. Click "View Check-In Code"
3. **Options:**
   - 📋 **Copy Code** - Share via WhatsApp/SMS
   - 🖨️ **Print Code** - Large format for poolside display

**Print includes:**
- Large code (120px font)
- Session details (date, time, squad, location)
- Parent check-in instructions
- Otters Kenya branding

### 11. View Session Attendance
1. Find session
2. Click "View Attendance"
3. See:
   - List of all swimmers who checked in
   - Check-in time for each
   - Check-in method (self/manual)
   - Swimmers expected but not checked in

**Manual Check-In:**
- Click "Mark Present" next to swimmer name
- For swimmers who forgot to check-in via app
- Records as "manual" check-in by admin

## 📈 Reports & Analytics

### 12. Generate Reports
**Path**: `/admin/reports`

**Available Reports:**
1. **Registration Report**
   - New registrations by date range
   - Conversion rate (registered vs paid)
   - Revenue generated

2. **Attendance Report**
   - Attendance by swimmer
   - Attendance by session
   - Squad attendance trends
   - No-show analysis

3. **Payment Report**
   - Outstanding payments
   - Revenue by period
   - Payment method breakdown
   - Overdue invoices

4. **Swimmer Report**
   - Active swimmers by squad
   - Age distribution
   - Registration trends

**Export Options:**
- 📊 CSV for Excel
- 📄 PDF for printing
- 📧 Email report (future feature)

## 🏆 Swimming Meets (Optional)

### 13. Upload Meet Results
**Path**: `/admin/meets/upload`

1. Click "New Meet"
2. Enter meet details
3. Upload results (CSV format)
4. System processes and displays results
5. Parents can view their swimmer's times

### 14. View Meet History
**Path**: `/admin/meets`

- All past meets
- Results by swimmer
- Personal bests tracking
- Squad performance

## ⚙️ Admin Settings

### 15. Update Registration Fee
1. Navigate to admin settings
2. Modify registration fee amount
3. Effective for new registrations only
4. Existing invoices unchanged

### 16. Manage Squad Definitions
- Add new squads
- Modify existing squad details
- Set capacity limits (future feature)

### 17. User Management
- View all registered parents
- Search by email/name
- View parent's swimmers
- Reset parent passwords if needed

## 🔍 Monitoring & Maintenance

### 18. Check System Health
**Dashboard indicators:**
- ✅ Payment gateway status
- ✅ Database connectivity
- ✅ Email service status
- ⚠️ Any warnings/errors

### 19. Review Consent Records
- Verify all swimmers have consent on file
- Check consent metadata (IP, timestamp)
- Ensure GDPR/Data Protection Act compliance

## 📱 Mobile Admin Access

Admins can use the platform on mobile:
- ✅ Check pending registrations on-the-go
- ✅ Approve swimmers from phone
- ✅ Generate session codes at poolside
- ✅ View attendance in real-time
- ✅ Responsive design for tablets

## 🆘 Common Admin Tasks

### Daily Tasks
- [ ] Check pending registrations
- [ ] Approve paid swimmers
- [ ] Create today's training session
- [ ] Print/display session code at pool
- [ ] Monitor check-ins during training
- [ ] Review attendance after session

### Weekly Tasks
- [ ] Follow up on overdue payments
- [ ] Send reminders to pending registrations
- [ ] Review attendance patterns
- [ ] Contact parents of frequent no-shows
- [ ] Update any squad changes

### Monthly Tasks
- [ ] Generate payment report
- [ ] Generate attendance report
- [ ] Review registration trends
- [ ] Export data for accounting
- [ ] Archive old sessions
- [ ] Check system backups

## 📞 Support Workflows

### Parent Queries

**"I paid but still showing pending"**
1. Check `/admin/invoices`
2. Search by parent email
3. Verify payment in Paystack dashboard
4. If payment confirmed, manually mark as paid
5. Refresh - swimmer should now be approved

**"I can't log in"**
1. Verify email is correct
2. Check if email is verified (look in Supabase Auth)
3. Send password reset link
4. Or reset password manually

**"Wrong swimmer details"**
1. Go to `/admin/swimmers`
2. Find swimmer
3. Click "Edit"
4. Update details
5. Save changes

### Payment Issues

**Cash Payment Received:**
1. Note receipt number
2. Find invoice in system
3. Mark as "Paid"
4. Enter receipt reference
5. Approve swimmer

**Bank Transfer Received:**
1. Verify transfer in bank account
2. Note transaction reference
3. Find invoice by parent name
4. Mark as paid with reference
5. Approve swimmer

## 🎯 Quick Reference

| Task | Location | Action |
|------|----------|--------|
| Approve swimmer | `/admin/registrations` | Click "Approve" |
| Create session | `/admin/sessions` | "+ Create Session" |
| Print check-in code | Session list | "View Check-In Code" → "Print" |
| View attendance | Session | "View Attendance" |
| Check payment | `/admin/invoices` | Search by name |
| View all swimmers | `/admin/swimmers` | Filter/search |
| Generate report | `/admin/reports` | Select report type |
| Upload meet results | `/admin/meets/upload` | Upload CSV |

## 🔐 Security Best Practices

1. **Never share admin credentials**
2. **Log out on shared devices**
3. **Use strong, unique password**
4. **Enable 2FA** (when available)
5. **Verify parent identity** before making changes
6. **Keep sensitive data confidential** (medical info, contact details)
7. **Regular password changes** (every 90 days)
8. **Review audit logs** for suspicious activity (future feature)

## 📊 Dashboard Metrics Explained

**Pending Registrations:**
- Count of swimmers awaiting payment/approval
- Should decrease daily as payments come in

**Active Swimmers:**
- Total approved swimmers
- Grouped by squad

**Payment Status:**
- 🟢 Paid: X%
- 🟠 Pending: Y%
- 🔴 Overdue: Z%

**Attendance Rate:**
- Average check-ins per session
- Trends over time

## ✨ Pro Tips for Admins

1. **Print session codes in advance** for regular training days
2. **Check dashboard first thing in morning** for overnight registrations
3. **Use filters extensively** to find specific swimmers/payments quickly
4. **Export reports monthly** for record-keeping
5. **Bookmark frequently used pages** for quick access
6. **Use dark mode at poolside** for better screen visibility
7. **Keep Paystack dashboard open** for payment verification
8. **Screenshot important data** before making bulk changes

## 🚀 Advanced Features

### Bulk Operations (Future)
- Bulk approve swimmers
- Bulk email parents
- Batch create sessions

### Automated Reminders (Future)
- Auto-email for pending payments
- Session reminders to parents
- Birthday notifications

### Analytics Dashboard (Future)
- Revenue forecasting
- Attendance predictions
- Growth metrics

---

## Admin Workflow Example

**Monday Morning Routine:**
```
1. Login → Admin Dashboard
2. Check "Pending Registrations" (3 new)
3. Verify payments in Paystack
4. Approve all 3 paid swimmers
5. Create training sessions for the week
6. Print session codes for today
7. Display codes at poolside
8. Monitor check-ins during training
9. Mark any manual attendance
10. Review attendance report after session
```

**End of Week:**
```
1. Generate payment report
2. Send reminders for overdue payments
3. Export swimmer list for coaches
4. Review attendance patterns
5. Archive completed sessions
```

---

**Need technical support?** Contact system administrator
**Questions about club policies?** Refer to club handbook

Welcome to the Otters Kenya admin team! 🏊‍♂️💙
