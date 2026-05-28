# Tech stack (verified)

**Last verified:** 2026-05-21 (from `package-lock.json`, local `npm ls`, and repo config)

Use this doc when you need **exact versions** and **what each piece does**. The root [README](../README.md) summarizes the same stack for newcomers.

## Runtime & tooling

| Piece | Version (locked) | Role |
|--------|------------------|------|
| **Node.js** | 22.x tested locally (`v22.22.0`) | Dev and Vercel builds; use **Node 20+** (LTS) minimum |
| **npm** | 11.x (`11.15.0` tested) | Install and scripts |
| **Turbopack** | Bundled with Next 16 | Default dev bundler (`next dev`); `turbopack.root` in [`next.config.js`](../next.config.js) |

## Application (npm dependencies)

| Package | `package.json` | Installed (lock) | Role |
|---------|----------------|------------------|------|
| **next** | ^16.2.4 | **16.2.6** | App Router, API routes, SSR, middleware |
| **react** / **react-dom** | ^18.2.0 | **18.3.1** | UI (React 18 — not React 19) |
| **tailwindcss** | ^3.4.1 | **3.4.1** | Utility CSS |
| **postcss** / **autoprefixer** | ^8.4 / ^10.4 | 8.5.x / 10.4.x | CSS pipeline for Tailwind |
| **@supabase/supabase-js** | ^2.95.3 | **2.95.3** | DB, Auth, Storage from server and browser |
| **@supabase/ssr** | ^0.8.0 | **0.8.0** | Cookie-based auth in middleware and server components |
| **@ducanh2912/next-pwa** | ^10.2.9 | **10.2.9** | PWA manifest/service worker (disabled in `development`) |
| **@vercel/analytics** | ^2.0.1 | **2.0.1** | Production analytics on Vercel |
| **date-fns** / **date-fns-tz** | ^4.1 / ^3.2 | 4.1.0 / 3.2.0 | Dates and `APP_TIMEZONE` (default `Africa/Nairobi`) |
| **react-big-calendar** | ^1.19.4 | **1.19.4** | Admin session calendar |
| **react-hot-toast** | ^2.6.0 | **2.6.0** | In-app toast notifications |
| **jspdf** | ^4.1.0 | **4.2.1** | PDF receipts and exports |

**Not in `package.json` (removed or never added):** Zustand, `qrcode` — do not assume these exist; see [QUICK_START](QUICK_START.md) for current libs only.

## External services

| Service | Role in this app |
|---------|------------------|
| **Supabase** | PostgreSQL, Auth, RLS, Storage (swimmer photos, etc.) |
| **Paystack** | KES payments — registration, invoices, webhooks (`/api/paystack/*`) |
| **SMTP2GO** | Transactional email when `SMTP2GO_API_KEY` is set — receipts, coach pay, club announcements, feedback replies, staff notifications |
| **Vercel** | Hosting, preview deploys; Cron: `CRON_SECRET` → `/api/cron/coach-session-pay`, `/api/cron/recurring-billing` (25th), `/api/cron/data-retention` |

See [`.env.local.example`](../.env.local.example) for required and optional env vars (including email kill switches like `CLUB_ANNOUNCEMENT_EMAIL=0`, `STAFF_NOTIFICATIONS_EMAIL=0`).

## Auth & routing

- **[`middleware.js`](../middleware.js)** → [`lib/supabase/middleware.js`](../lib/supabase/middleware.js): session refresh and route protection.
- **Email/password login:** [`app/auth/login/route.js`](../app/auth/login/route.js) sets cookies via HTTP headers (mobile-friendly).
- **OAuth / recovery:** `app/auth/google`, PKCE callback, [`RecoverySessionRedirect`](../components/RecoverySessionRedirect.jsx) in root layout.

## Database migrations

Apply numbered files under `supabase/migrations/` in order through the **highest** file in the repo.

**Current head (feature):** `096_parent_feedback_admin_read_at.sql`  
**Comms / onboarding schema (091–096):** club announcements, parent feedback (+ read tracking), coach parent contact read state, coach broadcasts.

Optional maintenance SQL: `supabase/scripts/` (e.g. investor demo reset, comms-only reset — read comments before running).

## Architecture notes

- **App Router** under `app/` — no Pages Router.
- **Server APIs** under `app/api/`; sensitive work uses service role only where required.
- **RLS** on Supabase tables; new features need policy review.
- **Legacy parent check-in codes** removed; attendance is admin/coach session attendance — [CHECK_IN_CODE_DEPRECATION.md](CHECK_IN_CODE_DEPRECATION.md).

## Optional upgrades (not applied)

Run `npm outdated` locally for a live diff. As of 2026-05-21, safe **minor/patch** candidates included `@supabase/supabase-js`, `date-fns`, `postcss`, `autoprefixer`, and Tailwind **3.4.x** patches. **Major** jumps (React 19, Tailwind 4) need a dedicated upgrade pass and regression testing — not required for day-to-day club operations.

To refresh lockfile within current semver ranges:

```bash
npm update
npm run build
```

## Related docs

- [QUICK_START.md](QUICK_START.md) — clone, env, run
- [DEPLOYMENT.md](DEPLOYMENT.md) — Vercel, webhooks, redirects
- [DATABASE_SETUP.md](DATABASE_SETUP.md) — Supabase project setup
- [START_HERE.md](START_HERE.md) — operator onboarding hub
