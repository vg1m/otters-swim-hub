# Transactional email templates

All SMTP2GO mail is sent from [`lib/utils/send-email.js`](../lib/utils/send-email.js). HTML uses a shared receipt-aligned layout in [`lib/email/`](../lib/email/).

## Design

- Canvas `#F5F7FA`, card white, accent `#0066CC` (matches Tailwind `primary` and PDF receipts)
- Header: hosted logo + **Otters Swim Hub** + category label (Notification, Payment, etc.)
- Table-based 600px layout, inline styles only (Gmail / Outlook safe)
- Hidden preheader line for inbox snippets

## Support line in footers

The support address is defined in `lib/email/tokens.js` and rendered via `lib/email/footer.js`. It is **hidden** by default (`EMAIL_SUPPORT_VISIBLE_IN_EMAIL = false` in `footer.js`). Set that flag to `true` to show it again in HTML and plain-text footers.

## Logo

Emails reference:

`{NEXT_PUBLIC_EMAIL_PUBLIC_URL or https://otters.ke}/otters-logo.png`

Place the same asset used for PDF receipts at [`public/otters-logo.png`](../public/otters-logo.png) and deploy it to production. If the image is missing, alt text still shows the product name.

## Adding a new email

1. Add or extend an export in `send-email.js` (keep the same return shape as siblings).
2. Build content with helpers from [`lib/email/components.js`](../lib/email/components.js) (`emailParagraph`, `emailInfoBox`, `emailDataTable`, etc.).
3. Wrap with `buildOttersEmailHtml()` and plain text with `buildOttersEmailText()` from [`lib/email/build-otters-email.js`](../lib/email/build-otters-email.js).
4. Do **not** fork a one-off HTML document — extend the layout instead.

## Local preview

```bash
npm run preview:email
```

Opens HTML under `tmp/email-previews/` (staff notification, receipt, retention audit). Open files in a browser.

## Manual QA checklist

After template changes:

- [ ] Run `npm run preview:email`
- [ ] Send one real message each to Gmail and Outlook (staff notification + receipt) from staging with `SMTP2GO_API_KEY` set
- [ ] Confirm CTA links (`/admin/notifications`, `/login`, `/dashboard`) and subjects unchanged
- [ ] Confirm logo loads on production origin

## Pause outbound mail

Remove `SMTP2GO_API_KEY` on Vercel and redeploy — see [`.env.local.example`](../.env.local.example).
