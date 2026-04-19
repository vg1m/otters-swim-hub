# Otters Kenya Academy of Swimming Limited Management Platform

A modern, mobile-first web app for swim club operations: registration, billing, training sessions, attendance, and reporting.

## What it does

End-to-end club management:

- **Online registration** — Multi-step parent flow; squad and fee logic aligned with club rules
- **Secure payments** — Paystack (card, M-Pesa, bank) for registration and invoices
- **Training sessions** — Admin calendar with recurrence, facilities, and squad assignment
- **Attendance** — Recorded by admins (and coaches) per session; parents see context on the dashboard
- **Admin & coach areas** — Role-based dashboards, registrations, swimmers, invoices, meets, reports, facilities
- **Mobile-first UI** — Responsive layouts, touch-friendly controls, dark mode

**Note:** The legacy parent **self-service check-in code** flow has been **removed**. Attendance is handled through **session attendance** in the admin (and coach) tools. See [docs/CHECK_IN_CODE_DEPRECATION.md](docs/CHECK_IN_CODE_DEPRECATION.md) for background.

## Quick start

### Parents / guardians

📖 **[Parent user journey →](docs/PARENT_USER_JOURNEY.md)**

1. Sign up and verify email  
2. Register swimmer(s)  
3. Pay fees via Paystack when invoiced  
4. Use **Dashboard** for schedule context, invoices, and swimmer profiles  

### Administrators

📖 **[Admin user journey →](docs/ADMIN_USER_JOURNEY.md)**

1. Sign in (email/password uses server-side login for reliable session cookies)  
2. Review **Pending registrations**  
3. Create **Training sessions** and assign pools via **Facilities**  
4. Mark **Attendance** from **Sessions → session detail**  
5. Manage **Invoices**, **Meets**, and **Reports** as needed  

### Coaches

- **Coach dashboard:** `/coach` — club-defined coach workflows (sessions, notes, etc., per RLS)

### Developers

📖 **[Technical quick start →](docs/QUICK_START.md)**

## Tech stack

| Layer | Choice |
|--------|--------|
| App | **Next.js** (App Router), **React 18** |
| Styling | **Tailwind CSS** 3.4 |
| Data & auth | **Supabase** (PostgreSQL, Auth, RLS) |
| Payments | **Paystack** (KES) |
| PWA | **@ducanh2912/next-pwa** |
| Notable libs | **date-fns**, **react-big-calendar**, **react-hot-toast**, **jspdf**, **zustand** |

**Auth routing:** [`proxy.js`](proxy.js) runs Supabase session refresh (Next.js “proxy” convention; replaces deprecated `middleware` file name). Email/password sign-in posts to [`app/auth/login/route.js`](app/auth/login/route.js) so cookies are set via HTTP headers (better on mobile).

## Key features

### Registration & payments

- Digital registration with guardian details and consents  
- Paystack checkout and webhooks  
- Invoice creation, status, and parent **Invoices** view  
- PDF receipts (branding via app configuration)  

### Sessions & attendance

- Admin **Sessions** calendar with recurrence patterns  
- Facilities / pool locations linked to sessions; optional **directions** links (Google Maps) from facility addresses  
- Per-session **Attendance** UI (`/admin/sessions/[id]/attendance`)  
- Training data model evolves with migrations (squads, facilities, coach pay cron, etc.)  

### Admin tools

- Dashboard KPIs and quick links  
- **Registrations**, **Swimmers**, **Squads**, **Coaches**, **Facilities** (pools, schedules, lane capacity)  
- **Invoices**, **Reports**, **Meets** (including meet upload where configured)  
- Client-side search and mobile-friendly tables on several admin lists  

### Security

- **RLS** on Supabase tables (review policies when adding features)  
- Service role only on server routes that require it  
- HTTPS in production; secrets in environment variables only  
- **Hosting incident response:** If your provider (e.g. Vercel) reports a breach affecting customer credentials, follow [docs/VERCEL_INCIDENT_RESPONSE.md](docs/VERCEL_INCIDENT_RESPONSE.md) — review activity, rotate Supabase/Paystack/cron secrets, redeploy, verify webhooks.

## Installation

### 1. Clone and install

```bash
git clone <repository-url>
cd otters-swim-hub
npm install
```

### 2. Environment

Create `.env.local`:

```env
# Supabase (dashboard.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add any other keys your deployment uses (e.g. cron secrets, Twilio, if enabled).

### 3. Database

Apply **all** migrations in `supabase/migrations/` **in numeric order** (e.g. `001_…` through the latest `06x_…`). Use the Supabase SQL Editor or your migration workflow.

- New environments must include historical fixes and feature migrations, not only an early subset.  
- If you rely on short session codes in the schema, keep migration **`035_short_session_codes.sql`** and [docs/RUN_SESSION_CODE_MIGRATION.md](docs/RUN_SESSION_CODE_MIGRATION.md) in mind.  

Optional **maintenance scripts** (e.g. purging training data for test resets) live under `supabase/scripts/` — read each file’s comments before running.

### 4. Run locally

```bash
npm run dev
# http://localhost:3000
```

More detail: [docs/QUICK_START.md](docs/QUICK_START.md), [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

## Project structure (high level)

```
otters-swim-hub/
├── app/
│   ├── admin/           # Dashboard, registrations, swimmers, squads, sessions,
│   │                    # attendance, invoices, reports, meets, facilities, coaches
│   ├── api/             # paystack, receipts, registration, link-registrations, cron, …
│   ├── auth/            # login (server sign-in), OAuth callback
│   ├── coach/           # Coach dashboard
│   ├── dashboard/       # Parent dashboard
│   ├── invoices/        # Parent invoices
│   ├── login/, signup/, forgot-password/, reset-password/
│   ├── register/        # Multi-step registration
│   ├── settings/
│   ├── swimmers/        # Parent swimmer profiles & performance
│   └── page.js          # Marketing / landing
├── components/          # UI, layout, domain components (e.g. admin session fields)
├── lib/                 # supabase clients, paystack, utils, facilities helpers, cache
├── proxy.js             # Session refresh + route protection wiring
├── supabase/
│   ├── migrations/      # Numbered SQL migrations (run in order)
│   └── scripts/       # Optional SQL utilities
├── docs/                # User and technical documentation
└── public/              # Static assets, PWA icons
```

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for Vercel, env vars, Supabase redirect URLs, and Paystack webhooks (`/api/paystack/webhook`).

Production checklist (short):

- Live Paystack keys and matching `NEXT_PUBLIC_APP_URL`  
- Supabase Auth URL + redirect allow list  
- Cron or external scheduler if you use scheduled API routes (e.g. coach session pay)  

## Documentation index

| Audience | Doc |
|----------|-----|
| Parents | [docs/PARENT_USER_JOURNEY.md](docs/PARENT_USER_JOURNEY.md) |
| Admins | [docs/ADMIN_USER_JOURNEY.md](docs/ADMIN_USER_JOURNEY.md) |
| Check-in history | [docs/CHECK_IN_SYSTEM.md](docs/CHECK_IN_SYSTEM.md), [docs/CHECK_IN_CODE_DEPRECATION.md](docs/CHECK_IN_CODE_DEPRECATION.md) |
| Developers | [docs/QUICK_START.md](docs/QUICK_START.md), [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) |
| Database | [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) |
| Paystack | [docs/PAYSTACK_QUICK_START.md](docs/PAYSTACK_QUICK_START.md), [docs/PAYSTACK_INTEGRATION.md](docs/PAYSTACK_INTEGRATION.md) |
| Index | [docs/README.md](docs/README.md) |

## Current status (snapshot)

- **Registration, invoices, Paystack** — Core flows in production use  
- **Sessions & attendance** — Admin/coach-led attendance; calendar and recurrence supported  
- **Facilities** — Pools, schedules, capacity rules; maps directions from addresses  
- **Mobile UX** — Dashboards and many admin tables optimized for small screens  
- **Auth** — Server-side email login route + `proxy.js` session handling  

Roadmap items (e.g. richer email notifications) may be tracked in internal planning docs — see `docs/` and project boards.

## Known issues

No single “master” issue list in-repo; treat **GitHub/issues** or your internal tracker as source of truth. For historical fixes, see **docs/ARCHIVE/**.

## Contributing

Private project for **Otters Kenya Academy of Swimming Limited**. Contact the development team for access or changes.

## License

Proprietary — Otters Kenya Academy of Swimming Limited

---

**Questions?** Start with [docs/](docs/). **Developers?** [docs/QUICK_START.md](docs/QUICK_START.md)
