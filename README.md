# Otters Kenya Academy of Swimming Management Platform

A modern, mobile-first web app for swim club operations: registration, billing, training sessions, attendance, and reporting.

## What it does

End-to-end club management:

- **Online registration** — Multi-step parent flow; squad and fee logic aligned with club rules
- **Secure payments** — Paystack (card, M-Pesa, bank) for registration and invoices
- **Training sessions** — Admin calendar with recurrence, facilities, and squad assignment
- **Attendance** — Recorded by admins (and coaches) per session; parents see context on the dashboard
- **Admin & coach areas** — Role-based dashboards, registrations, swimmers, invoices, meets, reports, facilities
- **Mobile-first UI** — Responsive layouts, touch-friendly controls, dark mode

**Note:** The legacy parent **self-service check-in code** flow has been **removed**. Attendance is handled through **session attendance** in the admin (and coach) tools.

## Quick start

### Parents / guardians

1. Sign up and verify email  
2. Register swimmer(s)  
3. Pay fees via Paystack when invoiced  
4. Use **Dashboard** for schedule context, invoices, and swimmer profiles  

### Administrators

1. Sign in (email/password uses server-side login for reliable session cookies)  
2. Review **Pending registrations**  
3. Create **Training sessions** and assign pools via **Facilities**  
4. Mark **Attendance** from **Sessions → session detail**  
5. Manage **Invoices**, **Meets**, and **Reports** as needed  

### Coaches

- **Coach dashboard:** `/coach` — sessions, swimmer contacts, notes (per RLS)
- **Coach broadcast:** `/coach/broadcast` — message parents in your squads or other coaches

### Developers

1. Clone, `npm install`, copy [`.env.local.example`](.env.local.example) → `.env.local`
2. Apply Supabase migrations in `supabase/migrations/` in numeric order
3. `npm run dev` → http://localhost:3000

## Tech stack

| Layer | Choice (installed) | What it does |
|--------|-------------------|--------------|
| App | **Next.js 16.2.6** (App Router), **React 18.3.1** | Pages, API routes, SSR; Turbopack in dev |
| Styling | **Tailwind CSS 3.4.1** | Responsive, mobile-first UI |
| Data & auth | **Supabase** (`@supabase/supabase-js` 2.95.3, `@supabase/ssr` 0.8.0) | PostgreSQL, Auth, RLS, Storage |
| Payments | **Paystack** (KES) | Checkout, webhooks, invoices |
| Email | **SMTP2GO** (server env) | Receipts, staff/parent notifications, announcements (optional kill switches) |
| Hosting | **Vercel** | Production + previews; Cron: coach pay, **recurring billing** (25th), data retention |
| PWA | **@ducanh2912/next-pwa** 10.2.9 | Installable app; off in local dev |
| Notable libs | **date-fns** 4.1, **react-big-calendar** 1.19, **react-hot-toast** 2.6, **jspdf** 4.2, **@vercel/analytics** 2.0 | Calendar, toasts, PDFs, analytics |

**Node:** 20+ recommended (22.x used locally). **DB migrations:** apply through **`096_*`** (latest numbered file in `supabase/migrations/`).

**Auth routing:** Root [`proxy.js`](proxy.js) delegates to [`lib/supabase/middleware.js`](lib/supabase/middleware.js) for Supabase session refresh and route protection. Email/password sign-in posts to [`app/auth/login/route.js`](app/auth/login/route.js) so cookies are set via HTTP headers (better on mobile).

## Key features

### Registration & payments

- Digital registration with guardian details and consents  
- Paystack checkout and webhooks  
- **Onboarding invoice** on admin approval; automated monthly/quarterly (25th) and annual registration (25 Aug)  
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
- Production HTTP headers via [`lib/security/headers.js`](lib/security/headers.js) and [`public/.well-known/security.txt`](public/.well-known/security.txt)  
- **Supabase redirects:** Include production and preview URLs for `/reset-password` (and OAuth paths) under Authentication → URL Configuration  
- **Password reset:** `forgot-password` → `reset-password` uses browser PKCE; **[`RecoverySessionRedirect`](components/RecoverySessionRedirect.jsx)** in **[`app/layout.js`](app/layout.js)** forwards `?code=` (and OTP params) when GoTrue lands on `Site URL` without the reset path — still require allowlisted redirects for correct email links.

## Installation

### 1. Clone and install

```bash
git clone <repository-url>
cd otters-swim-hub
npm install
```

### 2. Environment

Create `.env.local` from [`.env.local.example`](.env.local.example). Minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add SMTP2GO, cron secrets, and production Paystack callback URL as needed (see example file comments).

### 3. Database

Apply **all** numbered migrations in `supabase/migrations/` **in ascending numeric order** through the **highest-numbered file** present (currently **`096_parent_feedback_admin_read_at.sql`**; ignore `CLEANUP_*` ad-hoc scripts unless you intend to run them). Use the Supabase SQL Editor or your migration workflow.

Optional **maintenance scripts** (e.g. purging training data for test resets) live under `supabase/scripts/` — read each file’s comments before running.

### 4. Run locally

```bash
npm run dev
# http://localhost:3000
```

## Project structure (high level)

```
otters-swim-hub/
├── app/
│   ├── admin/           # Dashboard, registrations, sessions, attendance, invoices,
│   │                    # announcements, feedback, meets, facilities, coaches, …
│   ├── api/             # paystack, receipts, registration, link-registrations, cron, …
│   ├── auth/            # POST login route, OAuth (google), PKCE/email callback,
│   │                    # session-from-hash, set-password, finish-invite
│   ├── coach/           # Coach dashboard, broadcast, parent contacts
│   ├── dashboard/       # Parent dashboard, feedback
│   ├── invoices/        # Parent invoices
│   ├── login/, signup/, forgot-password/, reset-password/
│   ├── register/        # Multi-step registration
│   ├── settings/
│   ├── swimmers/        # Parent swimmer profiles & performance
│   └── page.js          # Marketing / landing
├── components/          # UI, layout, domain components (e.g. admin session fields)
├── lib/                 # supabase clients, paystack, utils, facilities helpers, cache
├── proxy.js             # Entry: session refresh + route protection → lib/supabase/middleware.js
├── supabase/
│   ├── migrations/      # Numbered SQL migrations (run in order)
│   └── scripts/         # Optional SQL utilities
└── public/              # Static assets, PWA icons, security.txt, llms.txt
```

## Deployment

Deploy to **Vercel** (`vercel --prod`). Production checklist:

- Live Paystack keys and `NEXT_PUBLIC_APP_URL=https://otters.ke` (canonical host)  
- Supabase Auth **Site URL** and redirect allow list (include `/reset-password`, OAuth paths)  
- Paystack webhook: `https://otters.ke/api/paystack/webhook`  
- Cron routes secured with `CRON_SECRET` / Vercel cron config  
- Verify headers: `curl -sI https://otters.ke/` and `/.well-known/security.txt`

## Documentation

The `docs/` folder is **local only** (gitignored). Onboarding handouts, runbooks, and security notes live there on maintainer machines — not in the public repo.

## Current status (snapshot)

- **Registration, invoices, Paystack** — Core flows in production use  
- **Sessions & attendance** — Admin/coach-led attendance; calendar and recurrence supported  
- **Facilities** — Pools, schedules, capacity rules; maps directions from addresses  
- **Communications (Phases 0–2)** — Club announcements (`/admin/announcements`), parent feedback (`/dashboard/feedback`, `/admin/feedback`), coach broadcasts (`/coach/broadcast`), coach parent contacts on `/coach` (migrations **091–096**)  
- **Mobile UX** — Dashboards and many admin tables optimized for small screens  
- **Auth** — Server-side email login route, [`proxy.js`](proxy.js) session refresh, Google OAuth routes under `app/auth/`; password reset via `/forgot-password` → `/reset-password` (PKCE) with recovery forwarding in [`app/layout.js`](app/layout.js).

## Known issues

No single “master” issue list in-repo; treat **GitHub/issues** or your internal tracker as source of truth.

## Contributing

Private project for **Otters Kenya Academy of Swimming**. Contact the development team for access or changes.

## License

Proprietary — Otters Kenya Academy of Swimming
