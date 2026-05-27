# Investor demo — full database reset

Prepare production (or staging) for a **live investor demo** with a clean transactional slate while keeping pathway rubric squads and infrastructure.

## What stays vs what goes

| Kept | Removed |
|------|---------|
| Squads: `pups`, `dev1`, `dev2`, `dev3`, `bronze`, `silver`, `gold` | All other squad rows |
| Rubric domains/milestones for those seven slugs only | Custom `rubric_domains` slugs |
| Facilities, facility schedules, meets catalog | All training sessions, attendance, session pay |
| Admin + other coach/parent logins (empty data) | All swimmers, invoices, payments, receipts |
| | `ngonyo.gatahi@gmail.com` (full account) |
| | `coachotters@gmail.com` (full account) |

**Not deleted:** `facilities` (pool/venue records).

**Also cleared on full finalize:** `facility_schedules` and `facility_schedule_squads` (recurring pool weekly slots — rebuild live in admin). Training sessions remain separate (`training_sessions`).

## Scripts (run in order)

All live under [`supabase/scripts/`](../supabase/scripts/):

1. **`investor_demo_reset_PREVIEW.sql`** — read-only counts and lists (safe anytime)
2. **`investor_demo_reset.sql`** — destructive reset inside `BEGIN` (manual `COMMIT` required)
3. **`investor_demo_reset_VERIFY.sql`** — run after `COMMIT`

Do **not** use legacy [`CLEANUP_demo_data.sql`](../supabase/migrations/CLEANUP_demo_data.sql) for this reset.

## Before you run

1. Confirm Supabase **backup** or point-in-time recovery is available.
2. Run the **preview** script in SQL Editor; note custom squads and row counts.
3. Fix any **missing pathway squads** (preview shows `missing_slug` rows) before reset.
4. Schedule reset **before** the demo (not during).

## Run the reset

**Recommended if phased runs left swimmers/squads behind:** use [`investor_demo_reset_run_once.sql`](../supabase/scripts/investor_demo_reset_run_once.sql) (TRUNCATE + squads + auth in one `BEGIN`).

**If counts are still wrong after `run_once`:** run [`investor_demo_reset_clear_swimmers.sql`](../supabase/scripts/investor_demo_reset_clear_swimmers.sql) and/or [`investor_demo_reset_clear_sessions.sql`](../supabase/scripts/investor_demo_reset_clear_sessions.sql), then `COMMIT;`. Check with [`investor_demo_reset_status.sql`](../supabase/scripts/investor_demo_reset_status.sql).

1. Open Supabase → **SQL Editor** → New query.
2. Paste contents of `investor_demo_reset_run_once.sql` (or `investor_demo_reset.sql`) → **Run**.
3. Read the **post-check** notices in the Messages panel:
   - `swimmers: 0`, `training_sessions: 0`, `invoices: 0`, `squads: 7`
   - `ngonyo` / `coachotters` auth counts `0`
4. If everything matches expectations → new query → `COMMIT;` → Run.
5. If anything looks wrong → `ROLLBACK;` → Run (database unchanged).

### If Phase B aborts with "swimmers still exist"

Phase A did not run or was not committed. Run in order:

1. [`investor_demo_reset_phase_a_data.sql`](../supabase/scripts/investor_demo_reset_phase_a_data.sql) → `COMMIT;`
2. [`investor_demo_reset_phase_b_squads.sql`](../supabase/scripts/investor_demo_reset_phase_b_squads.sql) → `COMMIT;`
3. Delete ngonyo / coachotters if still present (Phase C in full reset, or Authentication dashboard)

Or run the full [`investor_demo_reset.sql`](../supabase/scripts/investor_demo_reset.sql) once → `COMMIT;` (includes A+B+C).

### If squads still show elite, development_*, pups_akhs, etc.

Phase B may not have run (e.g. transaction rolled back after an earlier script error). After Phase A is done (0 swimmers, 0 sessions), run:

[`investor_demo_reset_phase_b_squads.sql`](../supabase/scripts/investor_demo_reset_phase_b_squads.sql) → review notices → `COMMIT;`

Expected squads after fix: `pups`, `dev1`, `dev2`, `dev3`, `bronze`, `silver`, `gold` only.

### If `auth.users` delete fails

Some SQL Editor roles cannot delete auth rows. Then:

1. `ROLLBACK;` if the transaction is still open.
2. Delete users in **Authentication → Users** (ngonyo, coachotters).
3. Re-run the reset script, or run only Phase C + verify SQL manually.

## After COMMIT

1. Run `investor_demo_reset_VERIFY.sql` — all checks should show **PASS**.
2. App smoke test (5–10 min):
   - Admin login → `/admin/squads` — exactly 7 pathway squads
   - `/admin/swimmers` — empty
   - `/admin/sessions` — empty
   - `/admin/invoices` — empty
   - Parent login (non-deleted account) — empty dashboard
   - Coach login (not coachotters) — works
   - `ngonyo` / `coachotters` cannot log in

## Suggested live demo flow

1. Admin — confirm squads (Pups → Gold) on `/admin/squads`
2. Admin — create training sessions for demo week
3. Register or add swimmers → assign pathway squad + progress rubric template
4. Admin — assign coaches (not coachotters)
5. Coach — attendance; parent — Performance rubric tab
6. Optional — issue invoice / payment story

## Related docs

- General cleanup patterns: [`DEMO_DATA_CLEANUP_GUIDE.md`](DEMO_DATA_CLEANUP_GUIDE.md)
- Session-only purge (narrower scope): [`../supabase/scripts/purge_training_sessions.sql`](../supabase/scripts/purge_training_sessions.sql)
