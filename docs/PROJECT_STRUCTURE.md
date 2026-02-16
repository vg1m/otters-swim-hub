# Project Structure - Otters Kenya Swim Club

## 📁 Organized Directory Structure

```
otters-swim-hub/
├── 📄 Root Configuration Files
│   ├── .env.local.example          # Environment variables template
│   ├── .gitignore                  # Git exclusions
│   ├── jsconfig.json               # JavaScript config (path aliases)
│   ├── middleware.js               # Next.js middleware (auth)
│   ├── next.config.js              # Next.js configuration
│   ├── package.json                # Dependencies
│   ├── postcss.config.js           # PostCSS config
│   ├── tailwind.config.js          # Tailwind CSS config
│   └── README.md                   # Main project README
│
├── 📱 app/                         # Next.js App Router
│   ├── page.js                     # Landing page
│   ├── layout.js                   # Root layout
│   ├── globals.css                 # Global styles
│   │
│   ├── 🔓 Public Routes
│   │   ├── login/                  # Login page
│   │   ├── signup/                 # User registration
│   │   └── register/               # Swimmer registration
│   │       └── confirmation/       # Payment confirmation
│   │
│   ├── 👤 Parent Routes (Authenticated)
│   │   ├── dashboard/              # Parent dashboard
│   │   ├── swimmers/               # Swimmer profiles
│   │   ├── invoices/               # Invoice viewing
│   │   └── check-in/               # QR check-in system
│   │
│   ├── 👨‍💼 Admin Routes (Admin Only)
│   │   └── admin/
│   │       ├── page.js             # Admin dashboard
│   │       ├── registrations/      # Pending approvals
│   │       ├── swimmers/           # Swimmer management
│   │       ├── sessions/           # Training scheduler + QR
│   │       │   └── [id]/attendance/# Manual attendance
│   │       ├── invoices/           # Invoice management
│   │       ├── meets/              # Meet management
│   │       └── reports/            # Reports (future)
│   │
│   └── 🔌 api/                     # API Routes
│       ├── mpesa/                  # Payment (→ Paystack)
│       │   ├── stk-push/           # Payment initiation
│       │   └── callback/           # Payment webhook
│       └── auth/callback/          # Auth callback
│
├── 🧩 components/                  # React Components
│   ├── ui/                         # UI Component Library
│   │   ├── Button.jsx              # Button variants
│   │   ├── Card.jsx                # Card component
│   │   ├── Input.jsx               # Form input
│   │   ├── Select.jsx              # Dropdown select
│   │   ├── Modal.jsx               # Modal dialog
│   │   ├── Table.jsx               # Data table
│   │   └── Badge.jsx               # Status badges
│   ├── Navigation.jsx              # Main navigation
│   └── Footer.jsx                  # Footer component
│
├── 🔧 lib/                         # Utility Libraries
│   ├── supabase/                   # Supabase Integration
│   │   ├── client.js               # Browser client
│   │   ├── server.js               # Server client
│   │   └── middleware.js           # Auth middleware logic
│   │
│   ├── mpesa/                      # Payment (→ Paystack)
│   │   ├── auth.js                 # OAuth token
│   │   ├── stk-push.js             # STK Push
│   │   └── validation.js           # Callback validation
│   │
│   └── utils/                      # Helper Functions
│       ├── currency.js             # KES formatting
│       ├── date-helpers.js         # Date utilities
│       └── receipt-generator.js    # PDF receipts
│
├── 🪝 hooks/                       # Custom React Hooks
│   ├── useAuth.js                  # Authentication hook
│   ├── useSwimmers.js              # Swimmers data hook
│   └── useInvoices.js              # Invoices data hook
│
├── 📚 docs/                        # Documentation Hub
│   ├── README.md                   # Documentation index
│   ├── QUICK_START.md              # Quick setup guide
│   ├── IMPLEMENTATION_COMPLETE.md  # Feature documentation
│   ├── SETUP_COMPLETE.md           # Setup notes
│   ├── SUPABASE_SETUP.md          # Database setup
│   └── PROJECT_STRUCTURE.md       # This file
│
├── 🛠️ scripts/                     # Utility Scripts
│   ├── README.md                   # Scripts documentation
│   └── migrate-from-prisma.js      # Data migration
│
├── 🗄️ supabase/                    # Database
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
│
└── 🎨 public/                      # Static Assets
    ├── manifest.json               # PWA manifest
    └── icons/
        └── icon.svg                # App icon

```

## 📊 File Organization by Type

### Configuration Files (Root)
- All config files remain in root for standard tooling
- `.env.local.example` as template
- Build configs: `next.config.js`, `tailwind.config.js`, `postcss.config.js`

### Documentation (docs/)
All `.md` files except root `README.md`:
- ✅ `QUICK_START.md` - Setup and features
- ✅ `IMPLEMENTATION_COMPLETE.md` - Full technical docs
- ✅ `SETUP_COMPLETE.md` - Setup completion notes
- ✅ `SUPABASE_SETUP.md` - Database guide
- ✅ `PROJECT_STRUCTURE.md` - This file

### Scripts (scripts/)
Standalone utility scripts:
- ✅ `migrate-from-prisma.js` - Data migration

### Application Code (app/)
- Pages organized by route structure
- API routes in `/api`
- Colocation of route-specific components

### Components (components/)
- `/ui` - Reusable UI library
- Root - Layout components (Navigation, Footer)

### Libraries (lib/)
- `/supabase` - Database client
- `/mpesa` - Payment integration (→ Paystack)
- `/utils` - Helper functions

### Hooks (hooks/)
- Custom React hooks for data fetching
- Business logic abstraction

### Database (supabase/)
- SQL migrations only
- Scripts moved to `/scripts`

## 🎯 Key Design Decisions

### 1. Documentation Centralization
**Why:** Clean root directory, easier navigation
- All docs in `/docs` folder
- Root README points to docs
- Each subfolder has its own README

### 2. Scripts Separation
**Why:** Distinguish utility scripts from application code
- Migration scripts
- Future: seed data, backups, exports

### 3. Component Organization
**Why:** Scalable component architecture
- `/ui` - Design system components
- Root - App-level components

### 4. Flat Hook Structure
**Why:** Simple discoverability
- Small number of hooks
- Clear naming convention
- No subdirectories needed yet

### 5. Route-Based App Structure
**Why:** Next.js App Router convention
- Intuitive URL mapping
- Easier to find page code
- Colocation of related files

## 📈 Future Organization Considerations

As the project grows, consider:

### When to create new folders:
- **`/types`** - When TypeScript is added
- **`/contexts`** - If global state grows beyond Zustand
- **`/services`** - If business logic becomes complex
- **`/constants`** - When many constants appear
- **`/tests`** - When adding test suites

### Component organization growth:
- **`components/forms/`** - Reusable form components
- **`components/layouts/`** - Layout wrappers
- **`components/dashboard/`** - Dashboard-specific

## 🧹 Cleanup Completed

### Removed:
- ✅ Old `index.html` (replaced by Next.js)
- ✅ Static `styles.css` (replaced by Tailwind)
- ✅ Static `script.js` (replaced by React)

### Organized:
- ✅ All documentation → `/docs`
- ✅ Scripts → `/scripts`
- ✅ Updated all internal references
- ✅ Updated README with new structure

## 📝 File Count Summary

```
Total Project Files: ~60
├── Application Code: ~35
│   ├── Pages: 15
│   ├── Components: 10
│   ├── API Routes: 3
│   └── Utilities: 7
├── Documentation: 6
├── Configuration: 8
├── Scripts: 1
└── Database: 1
```

## 🔍 Finding Files Quickly

### By Feature:
- **Registration** → `app/register/page.js`
- **Admin Dashboard** → `app/admin/page.js`
- **Check-In** → `app/check-in/page.jsx`
- **Invoices** → `app/admin/invoices/page.jsx` (admin)
- **Invoices** → `app/invoices/page.jsx` (parent)

### By Type:
- **Components** → `components/ui/`
- **Hooks** → `hooks/`
- **Utils** → `lib/utils/`
- **Docs** → `docs/`

### By Function:
- **Auth** → `lib/supabase/` + `hooks/useAuth.js`
- **Payments** → `lib/mpesa/` (→ Paystack)
- **Database** → `supabase/migrations/`

---

**Clean, organized, and ready for Paystack integration** ✨
