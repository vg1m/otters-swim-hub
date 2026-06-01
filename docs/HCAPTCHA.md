# hCaptcha

Protects public abuse surfaces with server-side token verification.

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Client + server | Public widget key (safe to expose) |
| `HCAPTCHA_SECRET` | Server only | Verifies tokens at `api.hcaptcha.com/siteverify` |
| `HCAPTCHA_ENABLED` | Server | Set to `1` in production/staging |
| `NEXT_PUBLIC_HCAPTCHA_ENABLED` | Client | Set to `1` when the checkbox should render |

In **local development**, leave both `*_ENABLED` at `0` (or unset): the server skips verification and the widget is hidden.

In **production**, set both enabled flags to `1` and add keys in Vercel. Register hostnames in the hCaptcha dashboard (`localhost`, `otters.ke`, preview URLs).

## Protected flows

- Email login → `POST /auth/login`
- Email signup → `POST /api/auth/signup`
- Forgot password → `POST /api/auth/forgot-password`
- Swimmer registration apply → `POST /api/registration/apply`
- Parent feedback → `POST /api/parent/feedback` (dashboard form; requires parent session + captcha when enabled)
- Club announcement publish → `POST /api/admin/announcements` (admin modal; fan-out to all parents/staff)

## Not protected

- **Google OAuth** (`/auth/oauth/google`) — no captcha on that path by design.

## Implementation

- Widget: `components/auth/HCaptchaWidget.jsx` (email forms + parent feedback, above submit)
- Verify helper: `lib/hcaptcha/verify-token.js`

## Vercel

If hCaptcha is **already** configured for login/signup on Production (`HCAPTCHA_*` and `NEXT_PUBLIC_HCAPTCHA_*`), you do **not** need to change those vars for parent feedback — deploy the app update only; feedback uses the same keys.

First-time setup: add the four variables from the table above in **Vercel → Settings → Environment Variables**, then **redeploy** so `NEXT_PUBLIC_*` values are baked into the build.

To **stop automated emails** during a pen test, do **not** disable hCaptcha for that — clear or remove **`SMTP2GO_API_KEY`** on Vercel and redeploy (see `.env.local.example` comment under SMTP2GO).

### Local development

Keep `HCAPTCHA_ENABLED=0` and `NEXT_PUBLIC_HCAPTCHA_ENABLED=0` in `.env.local` (see `.env.local.example`). No widget, no server check — same as before.
