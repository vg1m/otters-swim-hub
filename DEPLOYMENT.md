# Deployment Guide - Vercel

## Quick Deploy Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy from Project Root
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N** (first time)
- What's your project's name? **otters-swim-hub**
- In which directory is your code located? **./**
- Want to override settings? **N**

### 4. Set Environment Variables in Vercel Dashboard

Go to: https://vercel.com/your-username/otters-swim-hub/settings/environment-variables

Add these environment variables (get values from your `.env.local`):

#### Required - Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://kgarfhqtbbvilqrswwca.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Required - Application:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Optional - Paystack (add later when ready):
```
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_CALLBACK_URL=https://your-app.vercel.app/api/paystack/callback
```

**Important:** Make sure all variables are set for **Production**, **Preview**, and **Development** environments.

### 5. Deploy to Production
```bash
vercel --prod
```

---

## Alternative: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository (GitHub/GitLab/Bitbucket)
3. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **./** 
   - Build Command: `npm run build` (auto-detected)
   - Install Command: `npm install` (auto-detected)
4. Add environment variables (see list above)
5. Click **Deploy**

---

## Post-Deployment Checklist

- [ ] Test login/signup functionality
- [ ] Verify Supabase connection works
- [ ] Test registration form
- [ ] Check all images load (especially the new logo)
- [ ] Test parent dashboard loading speed
- [ ] Verify navigation and footer display correctly
- [ ] Test responsive design on mobile
- [ ] (Optional) Set up custom domain in Vercel settings

---

## Custom Domain Setup (Optional)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `swim.otterskenya.com`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` and `PAYSTACK_CALLBACK_URL` environment variables

---

## Troubleshooting

### Build Fails
- Check all environment variables are set correctly
- Review build logs in Vercel dashboard
- Ensure `package.json` has correct Next.js version

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Review RLS policies if queries fail

### Images Not Loading
- Verify `public/otters-logo.png` exists in repo
- Check Next.js Image configuration in `next.config.js`

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Your app's production URL |
| `PAYSTACK_SECRET_KEY` | ⏸️ Later | Paystack secret key for payments |
| `PAYSTACK_PUBLIC_KEY` | ⏸️ Later | Paystack public key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | ⏸️ Later | Paystack public key (client-side) |
| `PAYSTACK_CALLBACK_URL` | ⏸️ Later | Payment callback URL |

---

## Quick Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Pull environment variables from Vercel
vercel env pull
```
