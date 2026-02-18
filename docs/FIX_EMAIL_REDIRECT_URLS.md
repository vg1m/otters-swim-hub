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

## Files to Check

None - this is a configuration fix, not code change.

Configuration locations:
1. `.env.local` - Local development
2. Vercel Dashboard - Production environment
3. Supabase Dashboard - Email template Site URL
4. Supabase Dashboard - Redirect URLs whitelist

## Build Status
✅ Build successful - no code changes needed!

This is a **configuration fix only** - update your Supabase and Vercel settings! 🚀
