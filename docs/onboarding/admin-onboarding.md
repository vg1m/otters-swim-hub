# Admin onboarding — one page

**Otters Swim Hub** · For club administrators

---

## 1. Get in

- Log in → **Admin dashboard** (`/admin`)
- Roles: **admin** (full access) vs **coach** (limited — see coach handout)

---

## 2. Registrations and swimmers

- **Registrations** — approve/reject pending swimmers; issue invoices
- **Swimmers** — edit profiles, assign **squad** and **coach**, approve status
- **Squads / Coaches** — manage squad list and head coaches per squad

---

## 3. Training sessions

- **Sessions** — create one-off or **recurring** sessions; assign squads and lead coach
- **Edit series** vs **single occurrence** (exceptions for one date)
- **Attendance** — open from session (include date in URL for recurring)
- Parents and coaches see updates via schedule + notifications

---

## 4. Invoices and payments

- **Invoices** — track issued/due/paid; resend invoice email where needed
- Paystack payments auto-record; manual approval for offline pay

---

## 5. Communications

- **Announcements** — broadcast club news to **all parents and coaches** (in-app + email)
- **Feedback** — parent messages inbox; reply in-app + email; view parent/emergency/shared-access details on each ticket
- **Notifications** — your alert feed for registrations and system events

---

## 6. Reports and compliance

- **Reports** — attendance and operational summaries as available
- **Privacy / consent** — swimmers have recorded consents; respect media opt-outs

---

## 7. Migrations and setup

- Apply new Supabase migrations in **numeric order** in the Supabase SQL Editor when the dev team releases them (through **096** for communications: announcements, feedback, coach tools)
- SMTP2GO required for outbound emails in production (`CLUB_ANNOUNCEMENT_EMAIL=0` / similar kill switches only on staging)

---

## 8. Who to contact

- **Technical / bugs:** your development contact
- **Investor or policy:** club leadership

---

*Add your club logo and screenshots offline before printing.*
