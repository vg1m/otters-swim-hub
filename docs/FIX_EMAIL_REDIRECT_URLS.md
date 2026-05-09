# Fix Email Confirmation Redirects - No More Localhost!

## Problem
Supabase confirmation emails redirect users to `localhost:3000` instead of the production URL, causing:
- ❌ Links don't work for users not on your machine
- ❌ Unprofessional experience
- ❌ Users can't confirm their accounts

## Root Cause

### 1. Environment Variable
`NEXT_PUBLIC_APP_URL` is set to localhost in `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase Email Templates
Email templates use the Site URL from Supabase project settings, which might be set to localhost.

## Solution: 2-Step Fix

### Step 1: Update Environment Variable for Production

**Create `.env.production` file:**
```env
# Production Environment Variables
NEXT_PUBLIC_APP_URL=https://otters-swim-hub.vercel.app

# Supabase (same as .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://kgarfhqtbbvilqrswwca.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (add to Vercel environment variables)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=your-paystack-key
```

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_APP_URL` = `https://otters-swim-hub.vercel.app`
3. Add all other secret keys (already done)
4. Redeploy

### Step 2: Update Supabase Email Settings

**Go to Supabase Dashboard:**

#### A. Update Site URL
1. Settings → API
2. Under "Configuration"
3. Change **Site URL** from:
   - ❌ `http://localhost:3000`
   - ✅ `https://otters-swim-hub.vercel.app`
4. Save

#### B. Update Redirect URLs
1. Settings → API
2. Under "Redirect URLs"
3. Add production URLs:
   ```
   https://otters-swim-hub.vercel.app/auth/callback
   https://otters-swim-hub.vercel.app/reset-password
   https://otters-swim-hub.vercel.app/dashboard
   ```
4. Keep localhost for local dev:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/reset-password
   http://localhost:3000/dashboard
   ```

#### C. Verify Email Templates
1. Authentication → Email Templates
2. For each template (Confirm signup, Reset password, etc.):
3. Check the redirect URL uses: `{{ .SiteURL }}`
4. This will automatically use the Site URL you set

**Example template:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

The `{{ .ConfirmationURL }}` uses your Site URL automatically.

## Verification

### Test 1: Signup Email
1. Sign up new user on production
2. Check email
3. Click confirmation link
4. **Expected:** Opens `https://otters-swim-hub.vercel.app/...` ✅

### Test 2: Password Reset Email
1. Click "Forgot Password" on production
2. Enter email
3. Check email
4. Click reset link
5. **Expected:** Opens `https://otters-swim-hub.vercel.app/reset-password` ✅

### Test 3: Local Development Still Works
1. Sign up user on localhost
2. Check email
3. **Expected:** Opens `http://localhost:3000/...` ✅

## Environment Variable Strategy

### Development (`.env.local`)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)
```env
NEXT_PUBLIC_APP_URL=https://otters-swim-hub.vercel.app
```

### In Code
```javascript
// Automatically uses correct URL based on environment
const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
```

## Where APP_URL is Used

1. **Paystack Callbacks** (`app/api/paystack/initialize/route.js`):
   ```javascript
   callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/register/confirmation?invoiceId=${invoice.id}`
   ```

2. **Paystack Invoice Payment** (`app/api/paystack/pay-invoice/route.js`):
   ```javascript
   callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices?reference=${paymentReference}`
   ```

3. **Supabase Auth**: Uses Site URL from dashboard settings

## Quick Fix Summary

### Immediate (Do Now):
1. **Supabase Dashboard** → Settings → API → Change Site URL to production
2. **Supabase Dashboard** → Settings → API → Add production redirect URLs
3. **Vercel Dashboard** → Environment Variables → Verify `NEXT_PUBLIC_APP_URL` is production URL
4. **Redeploy** to Vercel

### Verification:
1. Sign up new test user on production
2. Check confirmation email
3. Verify link goes to production URL
4. Click and confirm it works

## Common Mistakes to Avoid

❌ **Don't** hardcode URLs in code  
❌ **Don't** forget to update Supabase Site URL  
❌ **Don't** remove localhost from redirect URLs (needed for dev)  
✅ **Do** use environment variables  
✅ **Do** test both production and localhost  
✅ **Do** redeploy after changing Vercel env vars  

## Password reset (application behaviour)

Forgot-password uses **`POST /api/auth/forgot-password`** ([`app/api/auth/forgot-password/route.js`](../app/api/auth/forgot-password/route.js)) with **`credentials: 'include'`** so PKCE verifier cookies align with **`GET /auth/callback`** ([`app/auth/callback/route.js`](../app/auth/callback/route.js)), similar to [`app/auth/oauth/google/route.js`](../app/auth/oauth/google/route.js).

The [**`/reset-password` page**](../app/reset-password/page.jsx) parses the URL like [`app/auth/finish-invite/page.jsx`](../app/auth/finish-invite/page.jsx): **`?code=`** is forwarded to `/auth/callback?next=/reset-password`, **`token_hash` + `type`** likewise, and **`#access_token=…`** flows post to **`POST /auth/session-from-hash`** with **`next=/reset-password`**.

**User guidance:** PKCE resets work most reliably when the user opens the email link **in the same browser (and profile)** they used on “Forgot password”. If Supabase rejects the exchange (e.g. missing code verifier), request a fresh link.

Keep **`redirectTo`** as a single path (**`/reset-password` only**) in API code and in `resetPasswordForEmail`—do **not** nest **`?next=`** inside **`redirect_to`**, because that can break how GoTrue merges tokens (same constraint as coach invites).

## Outlook, Safe Links, and SMTP2GO deliverability

If reset messages **never arrive** for Outlook / Microsoft 365 while other providers receive them:

1. **SMTP2GO (or any custom SMTP)**  
   Confirm the sender domain has correct **SPF** and **DKIM** records per SMTP2GO’s dashboard, review **bounce / suppression** lists, and inspect delivery logs for Microsoft’s response codes.

2. **Supabase**  
   In the dashboard open **Authentication → Logs** around the send time.

3. **Recipient mailbox**  
   Check **Junk**, **focused vs other inbox**, and delays.

4. **Safe Links / link scanners**  
   Corporate email can prefetch or rewrite links (Microsoft Defender Safe Links). That can invalidate **one-time** reset links—users should tap the primary button once in a normal browser, or paste the underlying URL if permitted by policy.

## Files to Check

Application:

- [`app/api/auth/forgot-password/route.js`](../app/api/auth/forgot-password/route.js) — starts reset server-side (`redirect_to` origin from `getPublicOrigin`).
- [`app/forgot-password/page.jsx`](../app/forgot-password/page.jsx) — calls the API route above.
- [`app/reset-password/page.jsx`](../app/reset-password/page.jsx) — bridges tokens into a session.

Configuration (still required for correct redirect hosts):

1. `.env.local` — Local development
2. Vercel — Production environment variables (`NEXT_PUBLIC_APP_URL`, etc.)
3. Supabase — Site URL and **Redirect URLs** whitelist (must include production **`/auth/callback`** and **`/reset-password`**, plus localhost equivalents for dev)
4. Supabase — Custom SMTP (e.g. SMTP2GO) and email templates using **`{{ .ConfirmationURL }}`**
