# START HERE — Otters Swim Hub

**Documentation hub** for Otters Kenya Academy of Swimming.

> **For onboard sessions and day-to-day use**, start with the **one-page handouts** in [`onboarding/`](onboarding/). They are kept current with the product.  
> Long-form journey docs below are **optional deep dives** (some sections may lag behind the app).

---

## Choose your role

### Parent or guardian

**Start here:** [Parent onboarding (1 page)](onboarding/parent-onboarding.md)

Covers: login, dashboard, swimmers, schedule & attendance calendar, invoices, notifications, feedback, settings & family access.

**Deep dive (optional):** [Parent User Journey](PARENT_USER_JOURNEY.md)

### Coach

**Start here:** [Coach onboarding (1 page)](onboarding/coach-onboarding.md)

Covers: dashboard, my swimmers, family & contacts, sessions & attendance, rubrics, notifications, broadcast.

Coaches are **invited by an admin** — not the public parent sign-up flow. See [Admin-only coach provisioning](plans/admin-only-coach-provisioning.md).

### Administrator

**Start here:** [Admin onboarding (1 page)](onboarding/admin-onboarding.md)

Covers: registrations, swimmers/squads/coaches, sessions & recurring exceptions, attendance, invoices, **announcements**, **feedback**, notifications.

**Deep dive (optional):** [Admin User Journey](ADMIN_USER_JOURNEY.md)

### Developer or technical setup

**Start here:** [Quick Start](QUICK_START.md) · [Documentation index](README.md)

- Apply Supabase migrations in numeric order through **096** (communications & feedback: **091–096**).
- Configure Supabase, Paystack, SMTP2GO (production email).
- Deploy: [Deployment guide](DEPLOYMENT.md) or [Deployment guide (alt)](DEPLOYMENT_GUIDE.md).

**Future product work:** [Comms Phase 3 plan](plans/comms-phase-3-enhancements.md) (deferred).

---

## Quick actions (current app)

| I want to… | Where to go |
|------------|-------------|
| Sign up as a parent | `/signup` → then `/register` for swimmers |
| Parent dashboard | `/dashboard` |
| Pay an invoice | `/invoices` |
| Club messages & alerts | `/dashboard/notifications` |
| Message the club (parent) | `/dashboard/feedback` |
| Coach dashboard | `/coach` |
| Message parents / coaches | `/coach/broadcast` |
| Admin home | `/admin` |
| Approve registrations | `/admin/registrations` |
| Training sessions & calendar | `/admin/sessions` |
| Session attendance | `/admin/sessions/[id]/attendance` (use `?date=` for recurring) |
| Club announcement (all parents + staff) | `/admin/announcements` |
| Parent feedback inbox | `/admin/feedback` |
| Manage coaches | `/admin/coaches` |

---

## Documentation map

| Document | Use when |
|----------|----------|
| [onboarding/README.md](onboarding/README.md) | Index of printable handouts |
| [onboarding/parent-onboarding.md](onboarding/parent-onboarding.md) | **Primary** parent guide |
| [onboarding/coach-onboarding.md](onboarding/coach-onboarding.md) | **Primary** coach guide |
| [onboarding/admin-onboarding.md](onboarding/admin-onboarding.md) | **Primary** admin guide |
| [PARENT_USER_JOURNEY.md](PARENT_USER_JOURNEY.md) | Extended parent reference |
| [ADMIN_USER_JOURNEY.md](ADMIN_USER_JOURNEY.md) | Extended admin reference |
| [README.md](README.md) | Full technical & feature index |
| [PAYSTACK_QUICK_START.md](PAYSTACK_QUICK_START.md) | Payments |
| [CHECK_IN_SYSTEM.md](CHECK_IN_SYSTEM.md) | **Legacy** — parent `/check-in` codes; attendance is now mainly coach/admin on session attendance |
| [plans/comms-phase-3-enhancements.md](plans/comms-phase-3-enhancements.md) | Deferred comms features |
| [ARCHIVE/](ARCHIVE/) | Resolved historical fixes |

---

## What’s live today (product)

- Registration, squads, coaches, recurring sessions & exceptions  
- Parent schedule scoped to swimmer squads; attendance calendar on progress pages  
- Paystack invoices & receipts  
- In-app notifications + email (SMTP2GO) for key events  
- **Club announcements**, **parent feedback**, **coach broadcast**, **coach family & contacts** (migrations **091–096**)  
- Mobile-friendly dashboards for parent, coach, and admin  

**Not in scope yet:** Phase 3 comms (attachments, threaded feedback, etc.) — see [plan](plans/comms-phase-3-enhancements.md).

---

## Need help?

- **Parents / coaches / admins at the pool:** use the relevant [onboarding handout](onboarding/) first, then club office.  
- **Payments:** [Paystack Quick Start](PAYSTACK_QUICK_START.md)  
- **Database / migrations:** [Database setup](DATABASE_SETUP.md); apply new SQL files in `supabase/migrations/` in order.  
- **Old troubleshooting docs:** prefer onboarding + journeys; see [ARCHIVE](ARCHIVE/) only if investigating history.

---

*Last updated: May 2026 — handouts are the maintained entry point; update those when the product changes.*
