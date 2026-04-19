# Vercel security incident — response checklist (Otters swim-hub)

Use this when a hosting or CI provider reports unauthorized access to **internal systems** (e.g. Vercel’s 2025 incident). It is **operational guidance**, not legal advice.

## 1. Stay informed

- Read Vercel’s **official status / incident page** and any **email to your team** naming your account or a time window.
- If Vercel identifies you as an impacted customer, follow their direct instructions first.

## 2. Vercel account review (same day)

- [ ] **Team / members:** Confirm only current staff have access; remove former members.
- [ ] **2FA:** Enforce two-factor authentication for all Vercel users with production access.
- [ ] **Activity / audit:** Review deployment history, env changes, Git connections, and integrations for anything unfamiliar (note date/time).
- [ ] **Sensitive environment variables:** In Vercel → Project → Settings → Environment Variables, mark secrets as **Sensitive** where the product supports it (reduces exposure in the UI).

## 3. Secrets this codebase uses (rotate if exposure is plausible)

Rotate in **this order** where applicable: create new value in the provider → update **Vercel** (and local `.env.local`) → **redeploy** → **revoke old** key in the provider.

| Variable | Role in this repo | Where to rotate |
|----------|-------------------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS in server routes, webhooks, cron, some admin flows (`lib/supabase/service-role.js`) | Supabase Dashboard → Project Settings → API → **service_role** secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server anon access (RLS applies) | Supabase → API → **anon** public key |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (not secret; confirm it still matches your project) | Supabase → API |
| `PAYSTACK_SECRET_KEY` | Server-side Paystack API + webhook HMAC (`lib/paystack/client.js`) | Paystack Dashboard → Settings / API Keys |
| `CRON_SECRET` | `Authorization: Bearer` check on `GET /api/cron/coach-session-pay` (`app/api/cron/coach-session-pay/route.js`). Vercel Cron uses this env when invoking the route. | Generate a new random string in Vercel env; redeploy |
| `NEXT_PUBLIC_APP_URL` | OAuth redirect base, Paystack `callback_url`, email links | Set to production URL (e.g. `https://your-app.vercel.app`) |
| `COACH_PAY_NOTIFY_EMAIL` | Optional CC for coach pay emails | No secret; update if needed |
| `APP_TIMEZONE` | Optional; defaults to `Africa/Nairobi` in cron | Optional |

**README / templates** may also mention `PAYSTACK_PUBLIC_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. This repository’s server Paystack integration primarily uses **`PAYSTACK_SECRET_KEY`**; confirm your Vercel project matches what you actually use.

**After Paystack secret rotation:** In Paystack, ensure **webhook URL** still points to  
`https://<your-domain>/api/paystack/webhook`  
and that **test/live** mode matches your deployment.

## 4. Verify after rotation

- [ ] Trigger a **production redeploy** so all functions pick up new env values.
- [ ] **Smoke test:** parent or test account **login**, **invoice pay** (test mode if available), confirm redirect back to `/invoices` and webhook updates status.
- [ ] **Cron:** After changing `CRON_SECRET`, confirm Vercel Cron still authenticates (check cron invocation logs or call the route manually with the new `Authorization: Bearer` value).
- [ ] **Supabase:** If `service_role` was rotated, old keys stop working immediately — fix any stale env in preview deployments too.

## 5. Other processors (outside Vercel)

- **Supabase:** Review Auth / logs if the dashboard offers sign-in or API anomaly views.
- **Paystack:** Review recent transactions and webhook delivery logs for odd activity.
- **GitHub (or Git host):** If connected to Vercel, confirm no unexpected deploy keys or workflow changes.

## 6. Third-party widgets / hardcoded keys in repo

- **Privacy.ke DSR widget** (`components/PrivacyDSRWidget.jsx`) currently embeds an API key in source. After a broad incident, **rotate that key** in the Privacy.ke dashboard and **prefer moving the key to an environment variable** (e.g. `NEXT_PUBLIC_PRIVACY_KE_API_KEY`) so it is not committed — track as a follow-up code change.

## 7. Internal record (for audit / ODPC)

Keep a short log:

- Date, who performed the review, link to Vercel’s advisory.
- Which env vars were rotated and whether Paystack/Supabase confirmed revocation of old credentials.
- Any suspicious activity found (or “none”).

---

**References in this repo:** `lib/supabase/service-role.js`, `app/api/paystack/webhook/route.js`, `app/api/cron/coach-session-pay/route.js`, `vercel.json` (cron schedule).
