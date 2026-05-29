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

## Not protected

- **Google OAuth** (`/auth/oauth/google`) — no captcha on that path by design.

## Implementation

- Widget: `components/auth/HCaptchaWidget.jsx` (email forms only, above submit)
- Verify helper: `lib/hcaptcha/verify-token.js`
