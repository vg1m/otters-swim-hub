---
name: Admin-only coach provisioning
overview: Make coaches creatable only from `/admin/coaches` via an admin-only server flow (Supabase Auth Admin + service role), with role hardening so non-admins cannot self-elevate. Assignments stay on the same page as today.
todos:
  - id: api-invite-coach
    content: Add POST /api/admin/coaches/invite (session + admin check + service role inviteUserByEmail/createUser + profiles.role=coach)
    status: completed
  - id: migration-role-guard
    content: "New migration: BEFORE UPDATE trigger on profiles blocking role changes unless is_admin()"
    status: completed
  - id: optional-trigger-metadata
    content: "Optional: extend handle_new_user to read staff role from user metadata for cleaner defaults"
    status: cancelled
  - id: ui-add-coach
    content: "Coach Management: Add coach modal + wire to API + refresh roster"
    status: completed
  - id: docs-coach-flow
    content: Replace legacy coach self-signup docs with admin-invite flow
    status: completed
---

# Admin-only coach provisioning and role assignment

**Project copy:** Open this file from the repo at [`docs/plans/admin-only-coach-provisioning.md`](admin-only-coach-provisioning.md) (browse in Explorer). 

**Implemented:** `POST /api/admin/coaches/invite`, migration `066_profiles_role_change_guard.sql`, **Add coach** on [`/admin/coaches`](../../app/admin/coaches/page.jsx), and doc updates in [`COACH_VIEW_FIX.md`](../COACH_VIEW_FIX.md). Apply migration to your Supabase project. Optional `handle_new_user` metadata path was skipped in favor of a post-invite profile update via service role.

## Current state

- Roles live on [`profiles.role`](../../supabase/migrations/001_initial_schema.sql) (`parent` | `coach` | `admin`), with new users defaulting to `parent` via [`handle_new_user`](../../supabase/migrations/002_auto_create_profiles.sql) (and siblings in later migrations).
- Admins can **SELECT** all profiles and **UPDATE** any profile under RLS policy **"Admins can update profiles"** from [`060_coach_session_pay.sql`](../../supabase/migrations/060_coach_session_pay.sql) (`is_admin()`).
- [`app/admin/coaches/page.jsx`](../../app/admin/coaches/page.jsx) loads coaches with `.eq('role', 'coach')` and updates `full_name`, `email`, `coach_squad_id`, `per_session_rate_kes` but **never sets `role`** and does not create auth users.
- Public [`app/signup/page.jsx`](../../app/signup/page.jsx) is parent-focused (no coach role selector in the skimmed flow); legacy docs still describe coach self-signup—that model is **replaced** by your requirement.

## Target product behavior

**Canonical rule:** Coaches are **not** onboarded through the same sign-up flow as parents. They are **created by an admin** from **Coach Management** (`/admin/coaches`), then **assigned** to squads/swimmers on that same surface (existing assignment UI). Parents use `/signup` / `/register`; coaches do not.

1. **Coaches do not self-register** like parents. There is no reliance on `/signup` or `/register` for coach access.
2. **Admins add coaches from** [`/admin/coaches`](../../app/admin/coaches/page.jsx): collect at least **email** and **full name** (phone optional if you want parity with `profiles`).
3. After the account exists with `role = 'coach'`, **assignments** continue to work as today (`coach_assignments`, session lead coach, etc.).
4. Invited coaches complete **first sign-in** via Supabase’s **invite / set password** (or equivalent) rather than the public parent registration form—this is account activation, not “sign up” in the parent sense.

## Recommended architecture (safe by default)

### 1. Server-only coach creation API

Add a **Route Handler** under `app/api/admin/` (e.g. `app/api/admin/coaches/invite/route.js` or `create/route.js`) that:

- Authenticates the caller with the **user session** (existing pattern: `createRouteHandlerClient` from [`lib/supabase/route-handler.js`](../../lib/supabase/route-handler.js) or read session cookie + anon client).
- Verifies **`profiles.role === 'admin'`** for `auth.uid()` (query with the same user-bound client, or a lightweight check). Reject with **403** if not admin.
- Uses **`createServiceRoleClient()`** (you already use service role in e.g. [`app/api/cron/coach-session-pay/route.js`](../../app/api/cron/coach-session-pay/route.js)) to call **Supabase Auth Admin API**:
  - **Preferred:** [`inviteUserByEmail`](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) with `user_metadata` / `app_metadata` marking intent as coach, **or**
  - `createUser` with a random password + force password change, if you do not want email invites.
- Immediately ensures **`profiles`** row has `role = 'coach'` and matches `full_name` / `email` / optional `phone`:
  - Either rely on your existing **on-auth trigger** plus a follow-up `update`/`upsert` on `profiles` in the same handler after invite/create, **or** pass metadata the trigger can read (only if you extend the trigger in a new migration—today triggers default `role` to `parent`).

**Why server-only:** The service role key must never ship to the browser. The admin UI only calls your API.

### 2. Database alignment (migration)

- **Trigger / default role:** Avoid a race where `handle_new_user` always inserts `role = 'parent'` and the coach stays wrong. Pick one:
  - **A (simple):** Keep trigger as-is; in the API, after `inviteUserByEmail` / `createUser`, `update profiles set role = 'coach', ... where id = new_user_id` with service role (bypasses RLS).
  - **B (cleaner):** Extend `handle_new_user` to set `role` from `raw_user_meta_data` (e.g. `requested_role`) when present, and have the Admin API set that metadata only for staff invites (document that only trusted server sets this).

### 3. RLS hardening (strongly recommended)

Today **"Users can update own profile"** ([`005_fix_rls_recursion.sql`](../../supabase/migrations/005_fix_rls_recursion.sql)) can allow a malicious client to PATCH `role` on their own row unless something else blocks it. Add a **`BEFORE UPDATE` trigger** on `profiles` (new migration) that:

- If `OLD.role IS DISTINCT FROM NEW.role` and the session is **not** an admin (use `public.is_admin()` in a `SECURITY DEFINER` function), **raise exception**.
- Optionally restrict which columns non-admins may change (or keep settings page as-is and enforce at trigger for `role` only).

This keeps coach provisioning safe even if someone tampers with the client.

### 4. UI on [`app/admin/coaches/page.jsx`](../../app/admin/coaches/page.jsx)

- **"Add coach"** button opens a modal: email (required), full name (required), optional phone.
- Submit → `fetch('/api/admin/coaches/invite', { method: 'POST', ... })` with credentials.
- On success: toast + refresh `loadAllData()` so the new coach appears in the roster.
- Surface API errors clearly (duplicate email, invalid email, Supabase invite disabled, etc.).
- **Do not** add coach creation to `/signup` or `/register`.

### 5. OAuth / Google for coaches

- If coaches may use Google: either **disable OAuth for coaches** (invite email/password only), or accept that OAuth sign-up still creates users via `/auth/callback`—you’d need a rule: **OAuth without a prior staff invite defaults to parent** unless you maintain an allowlist. Simplest MVP: **coach access = email invite only**.

### 6. Docs cleanup

- Update [`docs/COACH_VIEW_FIX.md`](../COACH_VIEW_FIX.md) (and any similar) so "coach signup" steps are replaced with **admin invite from `/admin/coaches`**.

### 7. Optional later: demote coach

Not required for MVP. If added later: before setting `role` back to `parent`, check references (`coach_assignments`, `training_sessions.coach_id`, `swimmers.coach_id`, notes, pay events) and either block or require reassignment—with clear UX.

## Verification checklist

- Admin can invite/add coach from `/admin/coaches`; row appears with `role = 'coach'`.
- New coach completes invite link and lands with coach access (`/coach`, admin attendance rules per existing middleware).
- Non-admin cannot change `role` via direct Supabase client (trigger test).
- Service role key only in server env (e.g. `SUPABASE_SERVICE_ROLE_KEY`), never `NEXT_PUBLIC_*`.
