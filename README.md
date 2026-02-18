# Otters Kenya Swim Club Management Platform

A modern, mobile-first Progressive Web App for complete swim club management.

## 🏊 What It Does

Complete swim club management solution with:
- ✅ **Online Registration** - Parents register swimmers digitally
- ✅ **Secure Payments** - Paystack integration (Card/M-Pesa/Bank)
- ✅ **Check-In System** - Simple 6-character code entry
- ✅ **Admin Dashboard** - Manage registrations, payments, sessions
- ✅ **Attendance Tracking** - Real-time check-in monitoring
- ✅ **Mobile-First** - Works perfectly on phones and tablets

## 🚀 Quick Start

### For Parents/Guardians
📖 **[Read the Parent User Journey →](docs/PARENT_USER_JOURNEY.md)**

Quick steps:
1. Sign up and verify email
2. Register your swimmer(s)
3. Pay registration fee (KES 3,000)
4. Check-in at training sessions using 6-character codes

### For Administrators
📖 **[Read the Admin User Journey →](docs/ADMIN_USER_JOURNEY.md)**

Quick steps:
1. Login with admin credentials
2. Approve pending registrations
3. Create training sessions
4. Print/display session check-in codes
5. Monitor attendance in real-time

### For Developers
📖 **[Read the Technical Quick Start →](docs/QUICK_START.md)**

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 18, Tailwind CSS v3.4
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Payments**: Paystack (KES - Card/M-Pesa/Bank)
- **Hosting**: Vercel
- **PWA**: @ducanh2912/next-pwa

## ✨ Key Features

### Registration & Payments
- 📝 Digital swimmer registration with parent/guardian details
- 💳 Paystack integration (Card, M-Pesa, Bank Transfer)
- 💰 Pay now or pay later options
- 🧾 Automatic PDF receipts with branding
- 📊 Invoice management dashboard

### Check-In System
- 🔢 Simple 6-character session codes (e.g., `K4M8N2`)
- 📱 Mobile-friendly manual code entry
- ⚡ Instant check-in confirmation
- 📍 Poolside code display (print/digital)
- 🕐 Timestamped attendance records

### Admin Tools
- ✅ Automated approval on payment
- 📅 Training session scheduling
- 👥 Swimmer & parent management
- 💵 Payment tracking & reporting
- 📈 Attendance analytics
- 🏊 Multi-squad support (Competitive/Learn to Swim/Fitness)

### Security & Compliance
- 🔐 Row-Level Security (RLS) on all database tables
- 🔒 Supabase Auth with email verification
- 📜 GDPR-compliant consent recording with metadata
- 🛡️ HTTPS-only, encrypted payment processing
- 🔑 Secure environment variable management
- ✅ All security warnings resolved

## 🚀 Installation

### 1. Clone & Install
```bash
git clone <repository-url>
cd otters-swim-hub
npm install
```

### 2. Configure Environment
Create `.env.local`:
```env
# Supabase (from dashboard.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack (from paystack.com/dashboard)
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup
Run ALL migrations in Supabase SQL Editor (order matters!):
```bash
# Navigate to: dashboard.supabase.com → SQL Editor
# Run each file in supabase/migrations/ from 001 to 035
```

⚠️ **CRITICAL**: Run `035_short_session_codes.sql` for 6-character codes!

### 4. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

📖 **Detailed Setup**: [docs/QUICK_START.md](docs/QUICK_START.md)

## 📁 Project Structure

```
otters-swim-hub/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard
│   │   ├── registrations/        # Approve swimmers
│   │   ├── swimmers/             # Manage all swimmers
│   │   ├── sessions/             # Create & manage training
│   │   ├── invoices/             # Payment tracking
│   │   ├── reports/              # Analytics
│   │   └── meets/                # Swimming meet results
│   ├── api/                      # Backend API routes
│   │   ├── paystack/             # Payment processing
│   │   ├── receipts/             # PDF generation
│   │   └── link-registrations/   # Orphaned data linking
│   ├── register/                 # Multi-step registration
│   ├── check-in/                 # Session check-in
│   ├── dashboard/                # Parent dashboard
│   ├── invoices/                 # View & pay invoices
│   └── settings/                 # Profile management
├── components/                   # React components
│   ├── ui/                       # Button, Card, Input, etc.
│   └── Navigation.jsx            # Responsive nav with dark mode
├── lib/                          # Core utilities
│   ├── supabase/                 # DB client (SSR-aware)
│   ├── paystack/                 # Payment client
│   ├── cache/                    # Profile caching
│   └── utils/                    # Helpers
├── supabase/migrations/          # Database schema & fixes
│   ├── 001_initial_schema.sql    # Base tables
│   ├── 008_paystack_integration.sql  # Payment tables
│   ├── 035_short_session_codes.sql   # 6-char codes ⚠️
│   └── archive/                  # Diagnostic queries
├── docs/                         # Documentation
│   ├── PARENT_USER_JOURNEY.md    # Parent guide
│   ├── ADMIN_USER_JOURNEY.md     # Admin guide
│   └── ARCHIVE/                  # Resolved fixes
└── public/                       # Static assets
```

## 🌐 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Import to Vercel**
   - Go to vercel.com/new
   - Select your GitHub repo
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   Copy from `.env.local` to Vercel dashboard:
   - All `NEXT_PUBLIC_*` variables
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PAYSTACK_SECRET_KEY`
   - Update `NEXT_PUBLIC_APP_URL` to: `https://your-app.vercel.app`

4. **Configure Supabase**
   - Dashboard → Auth → URL Configuration
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

5. **Deploy!** 🚀

⚠️ **Production Checklist:**
- [ ] Use **LIVE** Paystack keys (not test!)
- [ ] Update Supabase redirect URLs
- [ ] Test payment flow end-to-end
- [ ] Enable Paystack webhook: `https://your-app.vercel.app/api/paystack/webhook`

📖 **Detailed Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📖 Documentation

### User Guides
- **[Parent User Journey](docs/PARENT_USER_JOURNEY.md)** - For parents/guardians
- **[Admin User Journey](docs/ADMIN_USER_JOURNEY.md)** - For administrators
- **[Check-In System](docs/CHECK_IN_SYSTEM.md)** - How check-in works

### Technical Guides
- **[Quick Start](docs/QUICK_START.md)** - Developer setup
- **[Database Setup](docs/DATABASE_SETUP.md)** - Supabase configuration
- **[Paystack Integration](docs/PAYSTACK_QUICK_START.md)** - Payment gateway
- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Codebase organization
- **[Deployment Guide](DEPLOYMENT.md)** - Going to production

### Important Migrations
- **[Session Code Migration](docs/RUN_SESSION_CODE_MIGRATION.md)** - ⚠️ Must run!
- **[Security Fixes](docs/SECURITY_FIXES.md)** - Database security patches

**📂 All Docs**: [docs/README.md](docs/README.md)

## 📊 Current Status

✅ **Registration & Payments** - Fully operational
✅ **Check-In System** - Simplified 6-character codes
✅ **Admin Dashboard** - Complete management tools
✅ **Security** - All patches applied, RLS configured
✅ **Mobile Responsive** - Works perfectly on all devices
⏳ **Email Notifications** - Pending (SMTP2GO integration)

## 🐛 Known Issues

None currently! 🎉

Report issues to the development team.

## 🤝 Contributing

Private project for Otters Kenya Swim Club.
For contributions or issues, contact the development team.

## 📝 License

Proprietary - Otters Kenya Swim Club

---

**Questions?** Check the [User Journey docs](docs/) or contact club administration.

**Developers?** See [Technical Quick Start](docs/QUICK_START.md)

🏊‍♂️ **Made with 💙 for Otters Kenya Swim Club**
