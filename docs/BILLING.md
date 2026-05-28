# Billing automation

Otters uses a **September–July swim year** (not calendar Jan–Dec). Automated invoices run on the **25th** of each month (06:00 EAT, via Vercel Cron `0 3 25 * *` UTC).

## Manual step (only)

**Admin approves** a pending registration → system creates the **onboarding invoice** (annual registration for the current/upcoming swim year + first training period). Parents pay via Paystack from the dashboard.

## Automated schedule (25th)

| When | Who | Line item |
|------|-----|-----------|
| **25 August** | All approved swimmers | Annual registration (`registration`) for **upcoming** swim year (e.g. `2026-27` before Sep 2026 season) |
| **25 Sep, Dec, Mar, Jun** | `preferred_payment_type = quarterly` | Quarterly training (`quarterly_training`), period `YYYY-YY-Qn` |
| **25th, Sep–Jul only** (not August) | `preferred_payment_type = monthly` | Monthly training (`monthly_training`), period `YYYY-MM` |

**Excluded from training automation:** `per_session` swimmers (bill manually per attendance), **inactive** swimmers, **4th+ siblings** (training waived; they still get **25 Aug** registration).

## Early bird (monthly training only)

- Pay **between the 25th and the 3rd of the following month** (club timezone, `APP_TIMEZONE`, default `Africa/Nairobi`) → **KES 2,000** off at Paystack checkout.
- Squad must have `early_bird_eligible` in the database.
- **Onboarding invoices:** full amount on the invoice; discount at payment if paid by the **3rd of the month after issue** (joiner grace) or within the standard 25th→3rd window.
- After the 3rd, Paystack charges the full `total_amount`.

## Due dates

Automated invoices: **due on the 3rd of the calendar month after issue** (end of early-bird window).

## Swim year labels

- Format: `2025-26` = season from Sep 2025 through Jul 2026.
- Registration `payment_period` uses swim year (not calendar `2026`).

## Cron endpoint

- **Path:** `GET /api/cron/recurring-billing`
- **Auth:** `Authorization: Bearer ${CRON_SECRET}` (same as coach-session-pay and data-retention)
- **Env:** `CRON_SECRET`, `APP_TIMEZONE`, Supabase service role, SMTP2GO for issued-invoice emails

### Manual test (production cron)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/recurring-billing
```

On non-25th dates the job returns `{ skipped: true, reason: 'not_billing_day' }`.

### Simulate any billing date (dev / staging)

Enabled when `NODE_ENV=development` **or** `ALLOW_BILLING_SIMULATE=1` (server). For the admin UI panel, also set `NEXT_PUBLIC_ALLOW_BILLING_SIMULATE=1`.

**Admin UI:** `/admin/invoices` → amber **Billing simulation** card (presets + custom date).

**Admin API (session cookie):**

```bash
curl -X POST http://localhost:3000/api/admin/billing/simulate \
  -H "Content-Type: application/json" \
  -H "Cookie: <your admin session cookies>" \
  -d '{"asOf":"2026-08"}'
```

**Cron API (CRON_SECRET, no browser session):**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/recurring-billing?simulate=1&asOf=2026-08"
```

- `asOf`: `YYYY-MM` (uses the **25th** of that month) or `YYYY-MM-DD`
- `simulate=1`: required with `asOf`; skips the “today must be the 25th” guard
- Creates **real** invoices — use a staging project or test swimmers only

### Local logic tests

```bash
npm run test:billing
```

## Code map

| Module | Role |
|--------|------|
| `lib/billing/swim-year.js` | Swim year, quarters, active months |
| `lib/billing/early-bird-window.js` | 25th→3rd payment window |
| `lib/billing/invoice-period-dedupe.js` | Skip duplicate period lines |
| `lib/invoices/create-swimmer-onboarding-invoice.js` | First invoice on approval |
| `lib/invoices/create-recurring-invoice.js` | Monthly / quarterly / Aug registration |
| `app/api/cron/recurring-billing/route.js` | Vercel cron entry |

## Assumptions

- Unpaid prior invoices do **not** block new period invoices (parents may have multiple open invoices).
- Quarterly amounts come from `squads.quarterly_fee` (or 3× monthly).
- Under-6 swimmers: registration waived on invoice lines.
