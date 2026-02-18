# ✅ FIX CONFIRMATION EMAILS - 2 MINUTE GUIDE

## The Issue
Confirmation emails redirect to `localhost:3000` instead of your production site.

---

## 🔧 FIXES (Do in order)

### 1️⃣ Fix Supabase Site URL (MOST IMPORTANT)

**Go to:** [Supabase Dashboard](https://supabase.com/dashboard/project/kgarfhqtbbvilqrswwca/settings/api)

1. Click **Settings** (left sidebar)
2. Click **API**
3. Scroll to **Configuration** section
4. Find **"Site URL"**
5. Change from: `http://localhost:3000`
6. Change to: `https://otters-swim-hub.vercel.app`
7. Click **Save**

✅ **Done! All emails will now redirect to production.**

---

### 2️⃣ Add Production Redirect URLs (Security)

**Same page** (Settings → API):

Scroll to **"Redirect URLs"** section:

**Add these:**
```
https://otters-swim-hub.vercel.app/*
https://otters-swim-hub.vercel.app/auth/callback
https://otters-swim-hub.vercel.app/reset-password
https://otters-swim-hub.vercel.app/dashboard
```

**Keep localhost for local dev:**
```
http://localhost:3000/*
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

Click **Save**

---

### 3️⃣ Verify Vercel Environment Variable

**Go to:** [Vercel Dashboard](https://vercel.com/vg1ms-projects/otters-swim-hub/settings/environment-variables)

**Check that this exists:**
```
NEXT_PUBLIC_APP_URL = https://otters-swim-hub.vercel.app
```

**If not:**
1. Click **Add New**
2. Key: `NEXT_PUBLIC_APP_URL`
3. Value: `https://otters-swim-hub.vercel.app`
4. Environment: **Production** ✅
5. Click **Save**
6. **Redeploy** your app

---

## ✅ That's It!

**Test:**
1. Sign up new user on **production** site
2. Check email
3. Click confirmation link
4. Should open: `https://otters-swim-hub.vercel.app/...` ✅

---

## Why This Happens

Supabase email templates use **`{{ .SiteURL }}`** variable, which comes from your project's Site URL setting. If that's set to localhost, all emails redirect there.

## No Code Changes Needed

This is **100% configuration** - no code deployment required after updating Supabase settings.

---

**⏱️ Total time: 2 minutes**  
**🎯 Result: Professional email experience**
