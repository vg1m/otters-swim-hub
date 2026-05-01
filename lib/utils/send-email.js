/**
 * Transactional email via SMTP2GO HTTP API (server-side only).
 *
 * Env:
 * - SMTP2GO_API_KEY (required to send; Vercel + .env.local locally)
 * - SMTP2GO_FROM_EMAIL (verified sender in SMTP2GO)
 * - SMTP2GO_FROM_NAME (optional display name, defaults to "Otters Swim Hub")
 * - NEXT_PUBLIC_EMAIL_PUBLIC_URL (optional; origin for login/links in emails, default https://otters.ke)
 * - NEXT_PUBLIC_FAMILY_INVITE_SIGNUP_URL (optional; full signup URL override, else {origin}/signup)
 */

const SMTP2GO_SEND_URL = 'https://api.smtp2go.com/v3/email/send'

const DEFAULT_EMAIL_PUBLIC_ORIGIN = 'https://otters.ke'

/** Canonical site origin for URLs inside emails (defaults to https://otters.ke). */
function emailPublicOrigin() {
  const raw = process.env.NEXT_PUBLIC_EMAIL_PUBLIC_URL?.trim()
  if (raw) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      return u.origin.replace(/\/+$/, '')
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_EMAIL_PUBLIC_ORIGIN
}

function emailLoginUrl() {
  return `${emailPublicOrigin()}/login`
}

function emailCoachHubUrl() {
  return `${emailPublicOrigin()}/coach`
}

function emailSignupUrl() {
  const full = process.env.NEXT_PUBLIC_FAMILY_INVITE_SIGNUP_URL?.trim()
  if (full) {
    try {
      const u = new URL(full.startsWith('http') ? full : `https://${full}`)
      return u.href.replace(/\/+$/, '')
    } catch {
      /* ignore */
    }
  }
  return `${emailPublicOrigin()}/signup`
}

/** Muted support line (no address) + company — use in all branded emails. */
const EMAIL_SUPPORT_PLACEHOLDER_TEXT = '\n\nSupport contact — coming soon\n'
const EMAIL_SUPPORT_PLACEHOLDER_HTML = `<p style="margin-top: 20px; margin-bottom: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">Support contact — coming soon</p>`
const EMAIL_COMPANY_GREY_HTML = `<p style="margin-top: 12px; margin-bottom: 0; font-size: 13px; color: #9ca3af;">Otters Kenya Academy of Swimming Limited</p>`

/** Basic HTML escape for untrusted names in email bodies */
function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @returns {{ ok: boolean, emailId?: string, error?: string, skipped?: boolean }} */
async function smtp2goSend({
  to,
  cc = [],
  bcc = [],
  subject,
  textBody,
  htmlBody,
}) {
  const apiKey = process.env.SMTP2GO_API_KEY?.trim()
  const fromEmail = process.env.SMTP2GO_FROM_EMAIL?.trim()
  const fromName = (process.env.SMTP2GO_FROM_NAME?.trim() || 'Otters Swim Hub').trim()

  if (!apiKey) {
    console.warn(
      '[send-email] SMTP2GO_API_KEY is not set — email not sent (add to .env.local and Vercel).'
    )
    return {
      ok: false,
      skipped: true,
      error: 'SMTP2GO_API_KEY not configured',
    }
  }
  if (!fromEmail) {
    console.error('[send-email] SMTP2GO_FROM_EMAIL is not set — email not sent.')
    return { ok: false, error: 'SMTP2GO_FROM_EMAIL not configured' }
  }

  const toList = (Array.isArray(to) ? to : [to]).map((e) => String(e).trim()).filter(Boolean)
  if (toList.length === 0) {
    return { ok: false, error: 'No recipient address' }
  }

  const sender = `${fromName.replace(/[<>]/g, '')} <${fromEmail}>`

  const payload = {
    sender,
    to: toList,
    subject: String(subject || '').trim() || '(no subject)',
  }

  if (htmlBody) payload.html_body = htmlBody
  if (textBody) payload.text_body = textBody

  const ccNorm = (Array.isArray(cc) ? cc : [cc])
    .map((e) => String(e).trim())
    .filter(Boolean)
  if (ccNorm.length > 0) payload.cc = ccNorm

  const bccNorm = (Array.isArray(bcc) ? bcc : [bcc])
    .map((e) => String(e).trim())
    .filter(Boolean)
  if (bccNorm.length > 0) payload.bcc = bccNorm

  if (!payload.html_body && !payload.text_body) {
    return { ok: false, error: 'Email must include text_body or html_body' }
  }

  try {
    const res = await fetch(SMTP2GO_SEND_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errMsg =
        json?.data?.error ||
        json?.error ||
        (typeof json === 'object' && JSON.stringify(json)) ||
        `${res.status} ${res.statusText}`
      console.error('[send-email] SMTP2GO error:', errMsg)
      return { ok: false, error: String(errMsg) }
    }

    if (json?.data?.error) {
      const errMsg = String(json.data.error)
      console.error('[send-email] SMTP2GO error:', errMsg)
      return { ok: false, error: errMsg }
    }

    const succeeded = json?.data?.succeeded ?? 0
    const failures = json?.data?.failures ?? []
    if (succeeded !== 1 && failures.length > 0) {
      const errMsg = failures.map((f) => f?.error || f).join('; ') || 'Send failed'
      console.error('[send-email] SMTP2GO failures:', errMsg)
      return { ok: false, error: errMsg }
    }

    const emailId = json?.data?.email_id
    return { ok: true, emailId }
  } catch (err) {
    console.error('[send-email] SMTP2GO request failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Receipt after successful Paystack webhook payment.
 *
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.receiptNumber - Receipt number
 * @param {string} params.invoiceId - Invoice ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.parentName - Parent name
 */
export async function sendReceiptEmail({
  to,
  receiptNumber,
  invoiceId,
  amount,
  parentName,
}) {
  try {
    const loginUrl = emailLoginUrl()

    const subject = `Receipt ${receiptNumber} — Otters Kenya Academy of Swimming Ltd.`
    const text = `Dear ${parentName},

Thank you for your payment!

Your payment has been successfully processed.

Receipt Number: ${receiptNumber}
Invoice ID: INV-${invoiceId.substring(0, 8).toUpperCase()}
Amount Paid: KES ${amount.toLocaleString()}

You can download your receipt from your dashboard at any time.

Log in to your account: ${loginUrl}
${EMAIL_SUPPORT_PLACEHOLDER_TEXT}Best regards,
Otters Kenya Academy of Swimming Limited

---
Payments secured by Paystack™
`

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0084d5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f5f7fa; padding: 30px; }
              .receipt-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .receipt-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .receipt-item strong { color: #0084d5; }
              .button { display: inline-block; background-color: #0084d5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Otters Kenya Academy of Swimming Ltd.</h1>
                <p>Payment Receipt</p>
              </div>

              <div class="content">
                <h2>Dear ${parentName},</h2>
                <p>Thank you for your payment! Your transaction has been successfully processed.</p>

                <div class="receipt-box">
                  <div class="receipt-item">
                    <span>Receipt Number:</span>
                    <strong>${receiptNumber}</strong>
                  </div>
                  <div class="receipt-item">
                    <span>Invoice ID:</span>
                    <strong>INV-${invoiceId.substring(0, 8).toUpperCase()}</strong>
                  </div>
                  <div class="receipt-item">
                    <span>Amount Paid:</span>
                    <strong>KES ${amount.toLocaleString()}</strong>
                  </div>
                </div>

                <p>You can download your official receipt from your parent dashboard at any time.</p>

                <a href="${loginUrl}" class="button">
                  Login to Dashboard
                </a>

                ${EMAIL_SUPPORT_PLACEHOLDER_HTML}
              </div>

              <div class="footer">
                <p>Otters Kenya Academy of Swimming Limited</p>
                <p><strong>Payments secured by Paystack™</strong></p>
              </div>
            </div>
          </body>
        </html>
      `

    const result = await smtp2goSend({
      to,
      subject,
      textBody: text,
      htmlBody: html,
    })

    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.log('[send-email] Receipt (dev fallback log):', { to, receiptNumber, err: result.error })
    }

    return {
      success: result.ok,
      message: result.ok
        ? 'Receipt email sent via SMTP2GO'
        : result.skipped
          ? 'Receipt email skipped (SMTP2GO not configured)'
          : `Receipt email failed: ${result.error}`,
      ...(result.emailId ? { emailId: result.emailId } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    }
  } catch (error) {
    console.error('sendReceiptEmail error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Send invoice email notification
 * @param {Object} params - Email parameters
 */
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  parentName,
  swimmers,
}) {
  const loginUrl = emailLoginUrl()

  const subject = `Invoice ${invoiceNumber} — Otters Kenya Academy of Swimming Ltd.`
  const swimmerLine =
    swimmers && swimmers.length > 0
      ? swimmers.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean).join(', ')
      : ''

  const text = `Dear ${parentName || 'Parent'},

You have a new invoice from Otters Kenya Academy of Swimming Limited.

Invoice: ${invoiceNumber}
Amount: KES ${Number(amount).toLocaleString()}
Due: ${dueDate || 'See invoice'}
${swimmerLine ? `Swimmers: ${swimmerLine}\n` : ''}
View and pay when ready: ${loginUrl}
${EMAIL_SUPPORT_PLACEHOLDER_TEXT}Otters Kenya Academy of Swimming Limited
`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0084d5;">Invoice ${invoiceNumber}</h2>
    <p>Dear ${parentName || 'Parent'},</p>
    <p>You have a new invoice from Otters Kenya Academy of Swimming Limited.</p>
    <table style="margin: 16px 0; border-collapse: collapse;">
      <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>KES ${Number(amount).toLocaleString()}</td></tr>
      <tr><td style="padding: 6px 12px 6px 0;"><strong>Due</strong></td><td>${dueDate || 'See invoice'}</td></tr>
      ${swimmerLine ? `<tr><td style="padding: 6px 12px 6px 0;"><strong>Swimmers</strong></td><td>${swimmerLine}</td></tr>` : ''}
    </table>
    <p><a href="${loginUrl}" style="display:inline-block;background:#0084d5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">View account</a></p>
    ${EMAIL_SUPPORT_PLACEHOLDER_HTML}
    ${EMAIL_COMPANY_GREY_HTML}
  </div>
</body>
</html>
`

  const result = await smtp2goSend({
    to,
    subject,
    textBody: text,
    htmlBody: html,
  })

  return {
    success: result.ok,
    message: result.ok ? 'Invoice email sent via SMTP2GO' : result.error || 'Send failed',
    ...(!result.ok ? { error: result.error } : {}),
  }
}

/**
 * Shared hub access: notify co-parent / partner to sign up with the invited email.
 * @param {Object} params
 * @param {string} params.inviteeEmail
 * @param {string | null} [params.inviteeName]
 * @param {string} params.primaryName
 * @param {string} [params.primaryEmail]
 */
export async function sendFamilySharedAccessInviteEmail({
  inviteeEmail,
  inviteeName,
  primaryName,
  primaryEmail,
}) {
  try {
    const signupUrl = emailSignupUrl()

    const inviteePlain = inviteeName?.trim() || ''
    const primaryPlain = primaryName?.trim() || 'A parent on your account'
    const primaryLabelHtml = escapeHtml(primaryPlain)
    const primaryEmailLine = primaryEmail?.trim()
      ? `\n\nInvited by: ${primaryEmail.trim()}`
      : ''
    const primaryEmailHtml = primaryEmail?.trim()
      ? `<p style="color:#6b7280;font-size:14px;">Invited by: <strong>${escapeHtml(primaryEmail.trim())}</strong></p>`
      : ''

    const subject = "You're invited to share Otters Swim Hub access"
    const text = `${inviteePlain ? `Hi ${inviteePlain},` : 'Hello,'}

${primaryPlain} has invited you to share access to Otters Swim Hub so you can view the same swimmers, invoices, and updates with your own login.

Important: when you create your account, use this exact email address:
${String(inviteeEmail).trim()}

After you sign up, your access will link automatically.

Sign up here: ${signupUrl}
${primaryEmailLine}
${EMAIL_SUPPORT_PLACEHOLDER_TEXT}Otters Kenya Academy of Swimming Limited
`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #0084d5; color: white; padding: 18px 20px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 20px;">Otters Swim Hub</h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.95;">Shared family access</p>
    </div>
    <div style="background: #f5f7fa; padding: 28px 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin-top: 0;"><strong>${inviteePlain ? `Hi ${escapeHtml(inviteePlain)},` : 'Hello,'}</strong></p>
      <p>${primaryLabelHtml} has invited you to share access so you can use your own login to see the same swimmers, invoices, and updates.</p>
      ${primaryEmailHtml}
      <p><strong>Use this exact email when you register:</strong></p>
      <p style="background: #fff; padding: 12px 16px; border-radius: 6px; border: 1px solid #0084d5; font-family: monospace; font-size: 15px;">${escapeHtml(String(inviteeEmail).trim())}</p>
      <p style="color:#4b5563;font-size:14px;">After you sign up with that address, access links automatically—no separate code.</p>
      <p style="margin: 24px 0;">
        <a href="${signupUrl}" style="display: inline-block; background: #0084d5; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Create your account</a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">Or open: <a href="${signupUrl}">${signupUrl}</a></p>
      ${EMAIL_SUPPORT_PLACEHOLDER_HTML}
      ${EMAIL_COMPANY_GREY_HTML}
    </div>
  </div>
</body>
</html>
`

    const result = await smtp2goSend({
      to: inviteeEmail,
      subject,
      textBody: text,
      htmlBody: html,
    })

    return {
      success: result.ok,
      message: result.ok
        ? 'Family invite email sent'
        : result.skipped
          ? 'Family invite email skipped (SMTP2GO not configured)'
          : `Family invite email failed: ${result.error}`,
      ...(!result.ok ? { error: result.error, skipped: !!result.skipped } : {}),
      ...(result.emailId ? { emailId: result.emailId } : {}),
    }
  } catch (error) {
    console.error('sendFamilySharedAccessInviteEmail error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Coach session pay stub / notification (cron after session end).
 * @param {Object} params
 * @param {string} params.coachEmail
 * @param {string} params.coachName
 * @param {number} params.amountKes
 * @param {string} params.sessionDate
 * @param {string} params.sessionEndLocal
 * @param {string} [params.notifyCc] - optional admin/finance copy
 */
export async function sendCoachSessionPayEmail({
  coachEmail,
  coachName,
  amountKes,
  sessionDate,
  sessionEndLocal,
  notifyCc,
}) {
  try {
    const coachHubUrl = emailCoachHubUrl()
    const subject = `Session pay recorded: ${sessionDate} (Otters Kenya Academy of Swimming Ltd.)`
    const text = `Hello ${coachName},

A training session you coached has ended. Pay for this session is recorded as:

Amount: KES ${Number(amountKes).toLocaleString()}
Session date: ${sessionDate}
Session end (local): ${sessionEndLocal}

This is an internal pay stub line for club records.

Coach hub: ${coachHubUrl}
${EMAIL_SUPPORT_PLACEHOLDER_TEXT}Otters Kenya Academy of Swimming Limited
`

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0084d5;">Session pay recorded</h2>
            <p>Hello ${coachName},</p>
            <p>A training session you coached has ended. Pay for this session is recorded as:</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>KES ${Number(amountKes).toLocaleString()}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Session date</strong></td><td>${sessionDate}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Session end (local)</strong></td><td>${sessionEndLocal}</td></tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">This is an internal pay stub line for club records.</p>
            <p style="margin: 16px 0;">
              <a href="${coachHubUrl}" style="display: inline-block; background: #0084d5; color: #fff !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">Open coach hub</a>
            </p>
            <p style="font-size: 12px; color: #9ca3af;"><a href="${coachHubUrl}" style="color: #64748b;">${coachHubUrl}</a></p>
            ${EMAIL_SUPPORT_PLACEHOLDER_HTML}
            ${EMAIL_COMPANY_GREY_HTML}
          </div>
        </body>
      </html>
    `

    const cc =
      notifyCc && String(notifyCc).trim() ? [String(notifyCc).trim()] : []

    const result = await smtp2goSend({
      to: coachEmail,
      cc,
      subject,
      textBody: text,
      htmlBody: html,
    })

    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.log('[send-email] Coach pay (dev log):', {
        to: coachEmail,
        cc: notifyCc || null,
        subject,
        err: result.error,
      })
    }

    return {
      success: result.ok,
      message: result.ok
        ? 'Coach pay email sent via SMTP2GO'
        : result.skipped
          ? 'Coach pay email skipped (SMTP2GO not configured)'
          : `Coach pay email failed: ${result.error}`,
      ...(!result.ok ? { error: result.error } : {}),
      ...(result.emailId ? { emailId: result.emailId } : {}),
    }
  } catch (error) {
    console.error('sendCoachSessionPayEmail error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
