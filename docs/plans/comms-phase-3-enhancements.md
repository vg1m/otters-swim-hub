---
name: Comms phase 3 enhancements
overview: "Post-onboard follow-ups for Otters Swim Hub communications: broadcast attachments, threaded parent feedback, family-delegate announcement fan-out, and a parent dashboard club-news card. Phases 0–2 and migrations 091–096 are live; do not rebuild those."
status: deferred
migrations_done: "091–096 applied in production (confirmed)"
todos:
  - id: phase3-attachments
    content: Supabase Storage broadcast-attachments bucket, signed URLs, admin/coach upload on publish, PDF/image limits
    status: pending
  - id: phase3-threaded-feedback
    content: parent_feedback_messages table + parent/admin UI for back-and-forth (replace single admin_response MVP)
    status: pending
  - id: phase3-delegate-announcements
    content: Fan-out club_announcements (and optionally coach_broadcasts) to active family_account_members
    status: pending
  - id: phase3-announcement-archive
    content: Parent dashboard pinned "latest club news" card + optional history link
    status: pending
---

# Communications — Phase 3 enhancements (deferred)

**Project copy:** [`docs/plans/comms-phase-3-enhancements.md`](comms-phase-3-enhancements.md)

**Status:** Deferred until Phases 0–2 have been used in production and you explicitly prioritize enhancements. **Migrations 091–096 are applied**; leave Phase 3 as additive work only.

---

## What is already shipped (do not redo)

Phases **0–2** of the communications & onboarding rollout are **complete** in code and DB.

| Phase | Scope | Key paths / migrations |
|-------|--------|-------------------------|
| **0** | Onboarding one-pagers | [`docs/onboarding/`](../onboarding/), linked from [`docs/START_HERE.md`](../START_HERE.md) |
| **1A** | Club announcements (admin → all parents + staff) | `091_club_announcements.sql`, [`app/admin/announcements`](../../app/admin/announcements/), [`lib/announcements/publish-club-announcement.js`](../../lib/announcements/publish-club-announcement.js), `CLUB_ANNOUNCEMENT_EMAIL=0` kill switch |
| **1B** | Parent feedback → admin, single admin reply | `092_parent_feedback.sql`, `095_parent_read_at.sql`, `096_admin_read_at.sql`, [`app/dashboard/feedback`](../../app/dashboard/feedback/), [`app/admin/feedback`](../../app/admin/feedback/), [`lib/parent/parent-account-context.js`](../../lib/parent/parent-account-context.js), [`components/shared/ParentAccountContextPanel.jsx`](../../components/shared/ParentAccountContextPanel.jsx) |
| **2C** | Coach parent / emergency / shared-access (scoped) | `093_coach_parent_contact_read.sql`, `GET /api/coach/swimmers/[swimmerId]/parent-context`, **Family & contacts** on [`app/coach/page.jsx`](../../app/coach/page.jsx) |
| **2A** | Coach → parent broadcast | `094_coach_broadcasts.sql`, [`app/coach/broadcast`](../../app/coach/broadcast/), `COACH_BROADCAST_EMAIL=0` |
| **2B** | Coach → coach (+ admin inbox) | Same `coach_broadcasts` with `audience = 'coaches'` |

**Notifier behavior (post-plan):** Nav badges and read-state — admin open tickets (`admin_read_at`), parent unread replies (`parent_read_at`), auto-mark on opening feedback/notifications pages. See hooks under [`hooks/`](../../hooks/) (`useAdminOpenFeedbackCount`, `useParentUnreadFeedbackRepliesCount`, `useAutoMarkNotificationsRead`).

**Intentionally not built from original plan:** Optional parent-contact shortcut on [`app/admin/sessions/[id]/attendance`](../../app/admin/sessions/[id]/attendance/) (poolside); coaches use dashboard **Family & contacts** only.

**Reuse patterns for Phase 3:** [`insertNotification`](../../lib/notifications/insert-notification.js), [`insertStaffNotification`](../../lib/notifications/insert-staff-notification.js), [`notifyAllAdmins`](../../lib/notifications/notify-all-admins.js), SMTP helpers in [`lib/utils/send-email.js`](../../lib/utils/send-email.js), admin API auth from [`app/api/admin/sessions/route.js`](../../app/api/admin/sessions/route.js).

---

## Why Phase 3 exists

Phase 1–2 were scoped for a **safe subset onboard**: text + optional link only, single admin response on feedback, no storage uploads. Phase 3 captures product requests that were **explicitly deferred** so onboard training stayed simple.

---

## Phase 3 items (full spec)

### 3A — File attachments on broadcasts

**Goal:** Allow PDF/images on club announcements and/or coach broadcasts without widening message scope to arbitrary files.

**Suggested design:**

- Supabase Storage bucket: `broadcast-attachments` (private).
- On publish: upload → store `storage_path` / `mime_type` / `size_bytes` on `club_announcements` and/or `coach_broadcasts` (new nullable columns or child table `broadcast_attachments`).
- Email + in-app: link via **signed URL** (short TTL); size/type limits (e.g. PDF, JPEG, PNG; max 5 MB).
- UI: optional file picker on admin announcements + coach broadcast compose; show attachment link in notification body / feed.
- RLS: admins full access; coaches upload only on own broadcasts; parents/staff read via signed URL or join through notification payload.

**Guardrails:** One attachment per message for MVP; virus scanning out of scope unless you add a vendor later.

**Env:** Optional `BROADCAST_ATTACHMENTS_ENABLED=0` for staging.

---

### 3B — Threaded parent feedback

**Goal:** Replace single `admin_response` field with a conversation thread (parent ↔ admin).

**Suggested design:**

- New table `parent_feedback_messages`: `id`, `feedback_id`, `author_id`, `author_role` (`parent` | `admin`), `body`, `created_at`.
- Keep `parent_feedback` as ticket header (`subject`, `status`, `parent_id`, `submitted_by`).
- Migrate existing `admin_response` into first admin message row; deprecate column later.
- Parent UI: thread under ticket; admin UI: reply box appends message, status `open` / `answered` / `closed` rules TBD (e.g. reopen on parent reply).
- Notifications: `notifyAllAdmins` on parent message; parent notification + email on admin message (extend current feedback email).
- Read badges: extend `parent_read_at` / `admin_read_at` to “last read message id” or per-message `read_at`.

**Risk:** Medium — UX and RLS for family delegates must mirror [`auth_user_can_access_parent_data`](../../supabase/migrations/063_family_account_shared_access.sql).

---

### 3C — Family delegates on announcements

**Goal:** Active co-parents / shared-access users receive club (and optionally coach) broadcasts, not only the primary `profiles.role = parent` account.

**Context today:**

- Fan-out uses primary parent profiles ([`lib/announcements/publish-club-announcement.js`](../../lib/announcements/publish-club-announcement.js), [`lib/coach/publish-coach-broadcast.js`](../../lib/coach/publish-coach-broadcast.js)).
- Feedback already supports delegate **submit** + admin sees shared-access block; announcements do not.

**Suggested design:**

- For each primary parent recipient, also insert `notifications` (and email if desired) for `family_account_members` where `status = active` and `member_user_id` is set.
- Dedupe: one notification per person per announcement (`dedupe_key` includes member id).
- Email: use member profile email; respect same kill switches.
- Coach broadcasts: decide policy — squad parents only vs delegates on same account (likely yes for parity).

---

### 3D — Announcement archive on parent dashboard

**Goal:** Pinned “latest club news” on [`app/dashboard/page.jsx`](../../app/dashboard/page.jsx) so parents do not hunt notifications for standing club info.

**Suggested design:**

- Query latest `club_announcements` by `published_at` (RLS already allows authenticated read).
- Card: title, excerpt, optional link, “View all” → notifications or new `/dashboard/news` list.
- Optional: last N announcements; no edit after publish (unchanged from Phase 1).

---

## Recommended implementation order

1. **3D** — Archive card (read-only, low risk, high parent UX).
2. **3C** — Delegate fan-out (extends existing publish libs).
3. **3A** — Attachments (storage + security review).
4. **3B** — Threaded feedback (largest schema + UI change).

---

## Out of scope (unchanged)

- Push notifications / PWA alerts
- SMS / WhatsApp
- Parent-to-parent or parent-to-coach direct messaging
- Merch store
- Editing club announcements after publish (unless you add archive/delete in a separate task)

---

## When to start

- Phases 0–2 stable in production (**done**).
- Admin trained on Announcements + Feedback; coaches on Broadcast + Family & contacts.
- Explicit product priority for attachments vs threading vs delegate fan-out.

---

## Related docs

- Onboarding handouts: [`docs/onboarding/`](../onboarding/)
- Long-form journeys: [`PARENT_USER_JOURNEY.md`](../PARENT_USER_JOURNEY.md), [`ADMIN_USER_JOURNEY.md`](../ADMIN_USER_JOURNEY.md)
- Other plans: [`admin-only-coach-provisioning.md`](admin-only-coach-provisioning.md)
