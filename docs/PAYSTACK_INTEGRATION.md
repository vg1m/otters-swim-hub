# Paystack Integration Guide

## Overview

This document outlines the complete Paystack payment integration for the Otters Kenya Swim Club management system. Paystack replaces the previous M-Pesa integration, providing support for multiple payment methods including cards, mobile money, and bank transfers.

## Features Implemented

### 1. **Payment Processing**
- ✅ Initialize payments for new registrations
- ✅ Pay existing invoices
- ✅ Support for "Pay Now" and "Pay Later" options
- ✅ Multiple payment channels (Card, Mobile Money, Bank Transfer)
- ✅ Secure webhook handling for payment confirmation

### 2. **Receipt Generation**
- ✅ Modern, branded PDF receipts with Otters Kenya logo
- ✅ Automatic receipt generation on successful payment
- ✅ Receipt download from parent dashboard
- ✅ Receipt download from admin dashboard
- ✅ "Payments secured by PayStack" branding

### 3. **Database Schema**
- ✅ Enhanced `payments` table with Paystack fields
- ✅ New `receipts` table for receipt records
- ✅ Automatic receipt number generation
- ✅ Payment channel tracking

### 4. **Email Notifications**
- ✅ Receipt email structure (placeholder for SMTP2GO)
- ⏳ Full email sending (pending SMTP2GO integration)

## Installation & Setup

### 1. Environment Configuration

Your Paystack test credentials are already configured in `.env.local`:

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

**For Production:**
1. Log in to your Paystack dashboard: https://dashboard.paystack.com
2. Navigate to Settings > API Keys & Webhooks
3. Copy your **Live** keys
4. Update the environment variables in Vercel:
   - `PAYSTACK_SECRET_KEY` (Live secret key)
   - `PAYSTACK_PUBLIC_KEY` (Live public key)
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (Live public key)

### 2. Database Migration

**IMPORTANT:** Apply the Paystack database migration to update your schema.

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/008_paystack_integration.sql`
6. Click **Run**

**Option B: Via Supabase CLI**
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 3. Configure Paystack Webhooks

Webhooks allow Paystack to notify your application when payments are completed.

**Steps:**
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Navigate to **Webhooks** section
3. Set the **Webhook URL** to:
   ```
   https://your-domain.vercel.app/api/paystack/webhook
   ```
   (Replace `your-domain.vercel.app` with your actual domain)

4. **Important:** Paystack will send a test event. Your webhook must return a `200` status to verify.

**Security:**
- The webhook handler automatically verifies signatures using HMAC SHA512
- Only authenticated requests from Paystack will be processed

## Payment Flow

### Registration Flow (New Users)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User fills registration form                             │
│    - Parent information                                      │
│    - Swimmer details                                         │
│    - Consent checkboxes                                      │
│    - Payment option: Pay Now / Pay Later                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/paystack/initialize                            │
│    - Creates invoice (status: draft or issued)              │
│    - Creates swimmer records                                 │
│    - Stores consent records                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Pay Now Flow    │    │  Pay Later Flow  │
├──────────────────┤    ├──────────────────┤
│ - Creates        │    │ - Invoice status │
│   payment record │    │   = 'issued'     │
│ - Initializes    │    │ - Swimmers stay  │
│   Paystack       │    │   'pending'      │
│ - Redirects to   │    │ - No payment     │
│   checkout       │    │   initialization │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │                       └─────────────────┐
         ▼                                         │
┌─────────────────────────────────────────────────│───────────┐
│ 3. User completes payment on Paystack checkout  │           │
└───────────────────┬─────────────────────────────│───────────┘
                    │                             │
                    ▼                             │
┌─────────────────────────────────────────────────│───────────┐
│ 4. POST /api/paystack/webhook (charge.success)  │           │
│    - Verifies webhook signature                  │           │
│    - Updates payment status → 'completed'        │           │
│    - Updates invoice status → 'paid'             │           │
│    - Generates receipt record                    │           │
│    - Approves swimmers                           │           │
│    - Sends receipt email                         │           │
└───────────────────┬─────────────────────────────│───────────┘
                    │                             │
                    ▼                             │
┌─────────────────────────────────────────────────│───────────┐
│ 5. User redirected to /register/confirmation    │           │
│    OR /register/success (pay later)  ◄──────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Existing Invoice Payment

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Parent views invoices on /invoices                       │
│    - Clicks "Pay Now" button                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/paystack/pay-invoice                           │
│    - Validates invoice ownership                            │
│    - Creates payment record                                 │
│    - Initializes Paystack transaction                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User redirected to Paystack checkout                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Webhook processes payment (same as registration flow)    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. User redirected back to /invoices                        │
│    - "Receipt" button now available                         │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### `/api/paystack/initialize` (POST)
Initialize payment for new registration.

**Request Body:**
```json
{
  "swimmers": [...],
  "parentInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+254712345678",
    "relationship": "father",
    "emergencyContactName": "Jane Doe",
    "emergencyContactRelationship": "mother",
    "emergencyContactPhone": "+254712345679"
  },
  "totalAmount": 3500,
  "consents": {
    "dataAccuracy": true,
    "codeOfConduct": true,
    "mediaConsent": true
  },
  "paymentOption": "pay_now"
}
```

**Response (Pay Now):**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "REG-abc12345-1234567890",
  "invoiceId": "uuid",
  "paymentId": "uuid"
}
```

**Response (Pay Later):**
```json
{
  "success": true,
  "message": "Registration submitted successfully!",
  "invoiceId": "uuid",
  "payLater": true
}
```

### `/api/paystack/pay-invoice` (POST)
Initialize payment for existing invoice.

**Request Body:**
```json
{
  "invoiceId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "INV-def67890-1234567890",
  "invoiceId": "uuid",
  "paymentId": "uuid"
}
```

### `/api/paystack/webhook` (POST)
Handle Paystack webhook events.

**Security:** Signature verified using HMAC SHA512.

**Handled Events:**
- `charge.success` - Payment completed successfully
- `charge.failed` - Payment failed

**Response:**
```json
{
  "received": true,
  "processed": true,
  "receipt_number": "REC-20240215-123456"
}
```

### `/api/receipts/[invoiceId]/download` (GET)
Download PDF receipt for a paid invoice.

**Response:** PDF file (application/pdf)

## Receipt Format

The modern receipt includes:

### Header
- **Otters Kenya** branding (white text on blue background #0084d5)
- Receipt title "OFFICIAL RECEIPT"

### Receipt Details
- Receipt number: `REC-YYYYMMDD-XXXXXX`
- Invoice ID
- Transaction reference
- Date

### Bill To Section
- Parent name
- Parent email
- Parent phone

### Line Items Table
- Description (e.g., "Registration: John Doe")
- Amount per item

### Total
- Total amount paid (highlighted in blue)

### Payment Details
- Payment method (Card/Mobile Money/Bank Transfer)
- Payment date and time
- Status: PAID (green)

### Footer
- "Thank you for your payment!"
- List of registered swimmers
- Otters Kenya contact information
- **"Payments secured by PayStack"** (bold)

## Database Schema Changes

### `payments` Table
New columns added:
- `paystack_reference` (TEXT, UNIQUE) - Paystack transaction reference
- `paystack_authorization_code` (TEXT) - For recurring payments
- `payment_channel` (TEXT) - Payment method used
- `paid_at` (TIMESTAMP) - When payment was completed

### `invoices` Table
Updated constraint:
- `payment_method` now accepts: 'paystack', 'mpesa', 'bank_transfer', 'cash'
- Default value: 'paystack'

### `receipts` Table (NEW)
Stores receipt records:
- `id` (UUID, PRIMARY KEY)
- `invoice_id` (UUID, FOREIGN KEY)
- `payment_id` (UUID, FOREIGN KEY)
- `receipt_number` (TEXT, UNIQUE) - Format: REC-YYYYMMDD-XXXXXX
- `receipt_url` (TEXT) - URL to stored PDF (optional)
- `receipt_data` (JSONB) - Receipt details for regeneration
- `issued_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**RLS Policies:**
- Parents can view their own receipts
- Admins can view all receipts
- System can insert receipts

## Testing

### Test Cards (Paystack Sandbox)
Use these test cards for testing in the Paystack dashboard:

**Successful Payment:**
- Card: `4084084084084081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Failed Payment:**
- Card: `5060666666666666666`
- CVV: `123`
- Expiry: Any future date

**Mobile Money (Test):**
- Select MTN, Airtel, or Vodafone
- Enter test phone number: `08012345678`

### Testing Checklist

- [ ] New registration with "Pay Now"
  - [ ] Payment initializes successfully
  - [ ] Redirects to Paystack checkout
  - [ ] Complete payment with test card
  - [ ] Webhook processes payment
  - [ ] Invoice marked as "paid"
  - [ ] Swimmers approved
  - [ ] Receipt generated
  - [ ] Receipt downloadable from dashboard

- [ ] New registration with "Pay Later"
  - [ ] Registration completes without payment
  - [ ] Invoice created with status "issued"
  - [ ] Swimmers remain "pending"
  - [ ] Success page displayed

- [ ] Pay existing invoice
  - [ ] "Pay Now" button appears on unpaid invoices
  - [ ] Payment initializes
  - [ ] Successful payment flow
  - [ ] "Receipt" button replaces "Pay Now"

- [ ] Receipt download
  - [ ] Parent can download receipt
  - [ ] Admin can download receipt
  - [ ] PDF displays correctly with branding

## Production Deployment

### Pre-Deployment Checklist

1. **Environment Variables** (Set in Vercel)
   ```
   PAYSTACK_SECRET_KEY=sk_live_xxxxx (LIVE KEY)
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx (LIVE KEY)
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx (LIVE KEY)
   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
   ```

2. **Paystack Webhook URL**
   - Update in Paystack dashboard to production URL
   - Test webhook delivery

3. **Database Migration**
   - Ensure `008_paystack_integration.sql` is applied to production database

4. **SMTP2GO Integration** (Future)
   - Set up SMTP2GO account
   - Configure API credentials
   - Update `lib/utils/send-email.js` to use SMTP2GO instead of placeholder

5. **Test Transaction**
   - Make a small live payment (KES 1)
   - Verify webhook processing
   - Verify receipt generation

### Post-Deployment Verification

- [ ] Live payment test successful
- [ ] Webhook receiving events
- [ ] Receipts generating correctly
- [ ] Emails being logged (or sent via SMTP2GO when ready)
- [ ] Parent dashboard shows payments
- [ ] Admin dashboard shows payments

## Troubleshooting

### Payment Initialization Fails
**Symptoms:** Error during payment initialization
**Solutions:**
1. Verify `PAYSTACK_SECRET_KEY` is set correctly
2. Check Supabase logs for invoice creation errors
3. Ensure database migration is applied
4. Check Paystack API status

### Webhook Not Receiving Events
**Symptoms:** Payment completes but invoice not updated
**Solutions:**
1. Verify webhook URL in Paystack dashboard
2. Check webhook signature verification
3. Review application logs for webhook errors
4. Test webhook manually using Paystack dashboard's "Send Test Event"

### Receipt Generation Fails
**Symptoms:** Error when downloading receipt
**Solutions:**
1. Ensure receipt record exists in database
2. Check `jspdf` package is installed
3. Verify user has permission to access invoice
4. Check browser console for errors

### Payment Status Not Updating
**Symptoms:** Payment completed on Paystack but invoice still "issued"
**Solutions:**
1. Check webhook logs
2. Verify payment reference matches in database
3. Manually mark invoice as paid in admin dashboard
4. Re-trigger webhook from Paystack dashboard

## Support & Maintenance

### Paystack Documentation
- API Reference: https://paystack.com/docs/api/
- Webhooks: https://paystack.com/docs/payments/webhooks/
- Test Cards: https://paystack.com/docs/payments/test-payments/

### Future Enhancements
- [ ] Recurring payments for subscriptions
- [ ] Refund processing
- [ ] Payment links for invoices via email
- [ ] Multi-currency support
- [ ] Payment reminders
- [ ] SMTP2GO integration for email delivery

## Summary

The Paystack integration is **complete and ready for testing**. All core features are implemented:

✅ Payment initialization for registrations and invoices
✅ Secure webhook processing
✅ Modern receipt generation with branding
✅ Parent and admin dashboard integration
✅ Email notification structure (pending SMTP2GO)

**Next Steps:**
1. Apply database migration
2. Test with Paystack sandbox
3. Deploy to production with live keys
4. Integrate SMTP2GO for email delivery

---

**Last Updated:** February 2026
**Version:** 1.0
**Author:** Cursor AI Assistant
