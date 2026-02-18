# Paystack Integration - Quick Start Guide

## 🚀 What's New

Paystack payment integration is now **fully implemented** and ready to replace M-Pesa! This includes:

- ✅ **Payment Processing** - Card, Mobile Money, Bank Transfer
- ✅ **Pay Now / Pay Later** - Flexible payment options for parents
- ✅ **Modern Receipts** - Branded PDF receipts with Otters Kenya logo
- ✅ **Webhook Integration** - Automatic payment confirmation
- ✅ **Dashboard Integration** - Pay Now buttons and Receipt downloads

## ⚡ Quick Setup (5 Minutes)

### Step 1: Apply Database Migration

**Go to Supabase Dashboard:**
1. Open https://app.supabase.com
2. Select your project: `kgarfhqtbbvilqrswwca`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL from:
   ```
   supabase/migrations/008_paystack_integration.sql
   ```
6. Click **RUN** button

### Step 2: Configure Paystack Webhook

**In Paystack Dashboard:**
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Under **Webhooks**, paste:
   ```
   https://your-vercel-app.vercel.app/api/paystack/webhook
   ```
   _(Replace with your actual Vercel domain)_
3. Save changes

### Step 3: Test with Sample Payment

**Use Paystack Test Cards:**
- **Card Number:** `4084084084084081`
- **CVV:** `408`
- **Expiry:** Any future date
- **PIN:** `0000`
- **OTP:** `123456`

## 🎯 What Works Right Now

### For Parents:
1. **Register New Swimmers**
   - Fill registration form
   - Choose "Pay Now" or "Pay Later"
   - If "Pay Now", redirect to secure Paystack checkout
   - Support for Card, Mobile Money, Bank Transfer

2. **View & Pay Invoices**
   - See all invoices in dashboard
   - Click "Pay Now" for unpaid invoices
   - Download receipt for paid invoices

3. **Receive Receipts**
   - Modern PDF receipt with Otters Kenya branding
   - Download anytime from dashboard
   - Email notification (structure ready for SMTP2GO)

### For Admins:
1. **Manage Invoices**
   - View all invoices with payment status
   - See payment method (Paystack)
   - Download receipts for parents
   - Manually mark invoices as paid if needed

2. **Track Payments**
   - Payment reference tracking
   - Payment channel visibility (Card/Mobile/Bank)
   - Transaction details

## 🔧 Environment Variables

Your test keys are already configured in `.env.local`:

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

**For Production** (when ready):
- Replace with **LIVE** keys from Paystack dashboard
- Update in Vercel environment variables

## 🧪 Testing Instructions

### Test Scenario 1: New Registration with Payment
1. Go to `/register`
2. Fill in parent and swimmer details
3. Accept consents
4. Select "Pay Now"
5. Click "Complete Registration"
6. **Expected:** Redirect to Paystack checkout
7. Use test card (details above)
8. Complete payment
9. **Expected:** Redirect to success page
10. Login and view dashboard
11. **Expected:** See invoice as "PAID" with "Receipt" button

### Test Scenario 2: New Registration - Pay Later
1. Go to `/register`
2. Fill in details
3. Select "Pay Later"
4. Submit
5. **Expected:** Success page with invoice details
6. Login
7. **Expected:** Invoice appears as "ISSUED" with "Pay Now" button

### Test Scenario 3: Pay Existing Invoice
1. Login as parent
2. Go to `/invoices`
3. Find invoice with status "ISSUED" or "DUE"
4. Click "Pay Now"
5. **Expected:** Redirect to Paystack
6. Complete payment
7. **Expected:** Return to invoices page
8. **Expected:** Invoice now shows "PAID" with "Receipt" button

### Test Scenario 4: Download Receipt
1. Login as parent
2. Go to `/invoices`
3. Find paid invoice
4. Click "Receipt" button
5. **Expected:** PDF downloads with:
   - Otters Kenya branding (blue header)
   - Receipt number
   - Payment details
   - Line items
   - "Payments secured by PayStack" footer

## 📋 Checklist Before Production

- [ ] Database migration applied
- [ ] Webhook URL configured in Paystack
- [ ] Test registration completed successfully
- [ ] Test invoice payment completed
- [ ] Receipt downloads correctly
- [ ] Replace test keys with LIVE keys in Vercel
- [ ] Test with real payment (small amount)
- [ ] Verify webhook receives live events

## ⚠️ Important Notes

1. **M-Pesa Endpoints Still Exist**
   - The old `/api/mpesa/stk-push` endpoint is not used anymore
   - Registration page now uses `/api/paystack/initialize`
   - Safe to remove M-Pesa endpoints later if desired

2. **Email Notifications**
   - Email structure is ready
   - Currently logs to console (placeholder)
   - When you're ready, integrate SMTP2GO:
     - Update `lib/utils/send-email.js`
     - Add SMTP2GO credentials to environment variables

3. **Webhook Security**
   - Signatures are automatically verified
   - Uses HMAC SHA512 with your secret key
   - Invalid signatures are rejected

## 🆘 Troubleshooting

### Problem: "Failed to create invoice"
**Solution:** Apply database migration (Step 1 above)

### Problem: Payment completes but invoice not updated
**Solution:** Check webhook URL is correct in Paystack dashboard

### Problem: Receipt download fails
**Solution:** Ensure invoice is marked as "paid" and receipt record exists

### Problem: Build fails
**Solution:** Run `npm install` and `npm run build` again

## 📚 Full Documentation

For comprehensive details, see:
- `docs/PAYSTACK_INTEGRATION.md` - Complete technical documentation
- Paystack API Docs: https://paystack.com/docs/api/

## 🎉 Ready to Go!

Your Paystack integration is **complete and functional**. Just apply the database migration and configure the webhook, then you're ready to test!

---

**Questions?** Check the full documentation or Paystack support.
