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

import { buildOttersEmailHtml, buildOttersEmailText } from '@/lib/email/build-otters-email'
import {
  emailDataTable,
  emailHighlightBox,
  emailInfoBox,
  emailMonospaceHighlight,
  emailParagraph,
} from '@/lib/email/components'
import { escapeHtml } from '@/lib/email/escape-html'
import { emailSupportTextBlock } from '@/lib/email/footer'
import {
  emailCoachHubUrl,
  emailLoginUrl,
  emailPublicOrigin,
  emailSignupUrl,
} from '@/lib/email/origin'

const SMTP2GO_SEND_URL = 'https://api.smtp2go.com/v3/email/send'

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
    const invShort = invoiceId.substring(0, 8).toUpperCase()

    const subject = `Receipt ${receiptNumber} - Otters Kenya Academy of Swimming.`
    const headline = 'Payment received'
    const text = buildOttersEmailText({
      recipientName: parentName,
      headline,
      bodyLines: [
        'Thank you for your payment! Your transaction has been successfully processed.',
        `Receipt Number: ${receiptNumber}`,
        `Invoice ID: INV-${invShort}`,
        `Amount Paid: KES ${amount.toLocaleString()}`,
        'You can download your official receipt from your parent dashboard at any time.',
      ],
      ctaUrl: loginUrl,
      footerVariant: 'payment',
    })

    const html = buildOttersEmailHtml({
      preheader: `Receipt ${receiptNumber} — KES ${amount.toLocaleString()}`,
      recipientName: parentName,
      category: 'Payment',
      headline,
      bodyHtml: [
        emailParagraph(
          'Thank you for your payment! Your transaction has been successfully processed.'
        ),
        emailInfoBox([
          ['Receipt number', escapeHtml(receiptNumber)],
          ['Invoice ID', escapeHtml(`INV-${invShort}`)],
          ['Amount paid', escapeHtml(`KES ${amount.toLocaleString()}`)],
        ]),
        emailParagraph(
          'You can download your official receipt from your parent dashboard at any time.',
          { muted: true }
        ),
      ].join(''),
      ctaLabel: 'Login to dashboard',
      ctaUrl: loginUrl,
      footerVariant: 'payment',
    })

    const result = await smtp2goSend({ to, subject, textBody: text, htmlBody: html })

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

/** @param {Object} params */
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  parentName,
  swimmers,
}) {
  const loginUrl = emailLoginUrl()
  const swimmerLine =
    swimmers && swimmers.length > 0
      ? swimmers.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean).join(', ')
      : ''

  const subject = `Invoice ${invoiceNumber} - Otters Kenya Academy of Swimming.`
  const headline = `Invoice ${invoiceNumber}`

  const infoRows = [
    ['Amount', escapeHtml(`KES ${Number(amount).toLocaleString()}`)],
    ['Due', escapeHtml(dueDate || 'See invoice')],
  ]
  if (swimmerLine) infoRows.push(['Swimmers', escapeHtml(swimmerLine)])

  const text = buildOttersEmailText({
    recipientName: parentName || 'Parent',
    headline,
    bodyLines: [
      'You have a new invoice from Otters Kenya Academy of Swimming.',
      `Amount: KES ${Number(amount).toLocaleString()}`,
      `Due: ${dueDate || 'See invoice'}`,
      ...(swimmerLine ? [`Swimmers: ${swimmerLine}`] : []),
      'View and pay when ready.',
    ],
    ctaUrl: loginUrl,
  })

  const html = buildOttersEmailHtml({
    preheader: `Invoice ${invoiceNumber} — KES ${Number(amount).toLocaleString()}`,
    recipientName: parentName || 'Parent',
    category: 'Payment',
    headline,
    bodyHtml: [
      emailParagraph(
        'You have a new invoice from Otters Kenya Academy of Swimming.'
      ),
      emailInfoBox(infoRows),
      emailParagraph('View and pay when ready.', { muted: true }),
    ].join(''),
    ctaLabel: 'View account',
    ctaUrl: loginUrl,
  })

  const result = await smtp2goSend({ to, subject, textBody: text, htmlBody: html })

  return {
    success: result.ok,
    message: result.ok ? 'Invoice email sent via SMTP2GO' : result.error || 'Send failed',
    ...(!result.ok ? { error: result.error } : {}),
  }
}

export async function sendSessionScheduleChangeEmail({
  to,
  parentName,
  title,
  body,
  changeKind,
}) {
  const loginUrl = `${emailPublicOrigin()}/dashboard`
  const displayTitle = title || 'Training schedule updated'
  const subject = `${displayTitle} — Otters Swim Hub`
  const safeBody = body ? escapeHtml(body) : ''

  const text = buildOttersEmailText({
    recipientName: parentName || 'Parent',
    headline: displayTitle,
    bodyLines: [
      body || 'The training schedule for your swimmer has been updated.',
    ],
    ctaUrl: loginUrl,
  })

  const html = buildOttersEmailHtml({
    preheader: displayTitle,
    recipientName: parentName || 'Parent',
    category: 'Club news',
    headline: displayTitle,
    bodyHtml: safeBody
      ? emailParagraph(safeBody, { muted: true })
      : emailParagraph('The training schedule for your swimmer has been updated.', {
          muted: true,
        }),
    ctaLabel: 'View dashboard',
    ctaUrl: loginUrl,
  })

  const result = await smtp2goSend({ to, subject, textBody: text, htmlBody: html })

  return {
    success: result.ok,
    skipped: result.skipped,
    message: result.ok ? 'Session schedule email sent' : result.error || 'Send failed',
    changeKind,
    ...(!result.ok ? { error: result.error } : {}),
  }
}

export async function sendClubAnnouncementEmail({
  to,
  parentName,
  title,
  body,
  linkUrl,
}) {
  const dashboardUrl = `${emailPublicOrigin()}/dashboard/notifications`
  const displayTitle = title || 'Club announcement'
  const subject = `${displayTitle} — Otters Swim Hub`
  const safeBody = body ? escapeHtml(body) : ''
  const linkBlock = linkUrl
    ? emailParagraph(
        `<a href="${escapeHtml(linkUrl)}" style="color:#0066CC;text-decoration:underline;">${escapeHtml(linkUrl)}</a>`,
        { muted: true }
      )
    : ''

  const text = buildOttersEmailText({
    recipientName: parentName || 'Parent',
    headline: displayTitle,
    bodyLines: [
      body || 'The club has posted a new announcement.',
      ...(linkUrl ? [`Link: ${linkUrl}`] : []),
    ],
    ctaUrl: dashboardUrl,
  })

  const html = buildOttersEmailHtml({
    preheader: displayTitle,
    recipientName: parentName || 'Parent',
    category: 'Club news',
    headline: displayTitle,
    bodyHtml: [
      safeBody
        ? emailParagraph(safeBody, { muted: true })
        : emailParagraph('The club has posted a new announcement.', { muted: true }),
      linkBlock,
    ].join(''),
    ctaLabel: 'View notifications',
    ctaUrl: dashboardUrl,
  })

  const result = await smtp2goSend({ to, subject, textBody: text, htmlBody: html })
  return {
    success: result.ok,
    skipped: result.skipped,
    ...(!result.ok ? { error: result.error } : {}),
  }
}

export async function sendCoachBroadcastParentEmail({
  to,
  parentName,
  title,
  body,
  linkUrl,
}) {
  const dashboardUrl = `${emailPublicOrigin()}/dashboard/notifications`
  const displayTitle = title || 'Message from your coach'
  const subject = `${displayTitle} — Otters Swim Hub`
  const safeBody = body ? escapeHtml(body) : ''
  const linkBlock = linkUrl
    ? emailParagraph(
        `<a href="${escapeHtml(linkUrl)}" style="color:#0066CC;text-decoration:underline;">${escapeHtml(linkUrl)}</a>`,
        { muted: true }
      )
    : ''

  const text = buildOttersEmailText({
    recipientName: parentName || 'Parent',
    headline: displayTitle,
    bodyLines: [
      'Your coach has sent a message.',
      body || '',
      ...(linkUrl ? [`Link: ${linkUrl}`] : []),
    ],
    ctaUrl: dashboardUrl,
  })

  const html = buildOttersEmailHtml({
    preheader: displayTitle,
    recipientName: parentName || 'Parent',
    category: 'Coach message',
    headline: displayTitle,
    bodyHtml: [
      emailParagraph('Your coach has sent a message.', { muted: true }),
      safeBody ? emailParagraph(safeBody, { muted: true }) : '',
      linkBlock,
    ].join(''),
    ctaLabel: 'View notifications',
    ctaUrl: dashboardUrl,
  })

  const result = await smtp2goSend({ to, subject, textBody: text, htmlBody: html })
  return {
    success: result.ok,
    skipped: result.skipped,
    ...(!result.ok ? { error: result.error } : {}),
  }
}

export async function sendParentFeedbackResponseEmail({
  to,
  parentName,
  subject,
  adminResponse,
}) {
  const feedbackUrl = `${emailPublicOrigin()}/dashboard/feedback`
  const feedbackSubject = subject || 'Your feedback'
  const emailSubject = `Reply: ${feedbackSubject} — Otters Swim Hub`
  const safeResponse = escapeHtml(adminResponse || '').replace(/\n/g, '<br />')

  const text = buildOttersEmailText({
    recipientName: parentName || 'Parent',
    headline: 'Reply to your feedback',
    bodyLines: [
      `Re: ${feedbackSubject}`,
      adminResponse || '',
    ],
    ctaUrl: feedbackUrl,
  })

  const html = buildOttersEmailHtml({
    preheader: `Reply: ${feedbackSubject}`,
    recipientName: parentName || 'Parent',
    category: 'Club news',
    headline: 'Reply to your feedback',
    bodyHtml: [
      emailParagraph(`Re: ${escapeHtml(feedbackSubject)}`, { muted: true }),
      emailParagraph(safeResponse, { muted: true }),
    ].join(''),
    ctaLabel: 'View feedback',
    ctaUrl: feedbackUrl,
  })

  const result = await smtp2goSend({ to, subject: emailSubject, textBody: text, htmlBody: html })
  return {
    success: result.ok,
    skipped: result.skipped,
    ...(!result.ok ? { error: result.error } : {}),
  }
}

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
    const inviteeAddr = String(inviteeEmail).trim()
    const greeting = inviteePlain ? `Hi ${inviteePlain},` : 'Hello,'

    const subject = "You're invited to share Otters Swim Hub access"
    const headline = 'Shared family access'

    const primaryEmailLine = primaryEmail?.trim()
      ? `Invited by: ${primaryEmail.trim()}`
      : ''

    const text = `${greeting}

${primaryPlain} has invited you to share access to Otters Swim Hub so you can view the same swimmers, invoices, and updates with your own login.

Important: when you create your account, use this exact email address:
${inviteeAddr}

After you sign up, your access will link automatically.

Sign up here: ${signupUrl}
${primaryEmailLine ? `\n${primaryEmailLine}\n` : ''}${emailSupportTextBlock()}Otters Kenya Academy of Swimming
`

    const primaryEmailHtml = primaryEmail?.trim()
      ? emailParagraph(
          `Invited by: <strong>${escapeHtml(primaryEmail.trim())}</strong>`,
          { muted: true }
        )
      : ''

    const html = buildOttersEmailHtml({
      preheader: `${primaryPlain} invited you to Otters Swim Hub`,
      greeting,
      category: 'Registration',
      headline,
      bodyHtml: [
        emailParagraph(
          `${escapeHtml(primaryPlain)} has invited you to share access so you can use your own login to see the same swimmers, invoices, and updates.`
        ),
        primaryEmailHtml,
        emailParagraph('<strong>Use this exact email when you register:</strong>'),
        emailMonospaceHighlight(inviteeAddr),
        emailParagraph(
          'After you sign up with that address, access links automatically-no separate code.',
          { muted: true }
        ),
      ].join(''),
      ctaLabel: 'Create your account',
      ctaUrl: signupUrl,
    })

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
    const subject = `Session pay recorded: ${sessionDate} (Otters Kenya Academy of Swimming.)`
    const headline = 'Session pay recorded'

    const text = buildOttersEmailText({
      recipientName: coachName,
      headline,
      bodyLines: [
        'A training session you coached has ended. Pay for this session is recorded as:',
        `Amount: KES ${Number(amountKes).toLocaleString()}`,
        `Session date: ${sessionDate}`,
        `Session end (local): ${sessionEndLocal}`,
        'This is an internal pay stub line for club records.',
      ],
      ctaUrl: coachHubUrl,
    })

    const html = buildOttersEmailHtml({
      preheader: `Session pay — ${sessionDate}`,
      recipientName: coachName,
      category: 'Payment',
      headline,
      bodyHtml: [
        emailParagraph(
          'A training session you coached has ended. Pay for this session is recorded as:'
        ),
        emailInfoBox([
          ['Amount', escapeHtml(`KES ${Number(amountKes).toLocaleString()}`)],
          ['Session date', escapeHtml(sessionDate)],
          ['Session end (local)', escapeHtml(sessionEndLocal)],
        ]),
        emailParagraph('This is an internal pay stub line for club records.', { muted: true }),
      ].join(''),
      ctaLabel: 'Open coach hub',
      ctaUrl: coachHubUrl,
    })

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

export async function sendRetentionAuditEmail({ to, runAt, total, checks, errors }) {
  try {
    const origin = emailPublicOrigin()
    const adminUrl = `${origin}/admin`
    const runDate = new Date(runAt).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const rows = [
      ['Attendance records past 2-year window', checks.attendance.count],
      ['Media consent records past 12 months', checks.mediaConsent.count],
      ['Consent records (inactive swimmer > 3 yrs)', checks.inactiveConsents.count],
      ['Inactive swimmer records past 7 years', checks.inactiveSwimmers.count],
      ['Paid invoice records past 7-year window', checks.payments.count],
    ]

    const textRows = rows.map(([label, count]) => `  ${label}: ${count}`).join('\n')
    const errorBlock =
      errors.length > 0
        ? `\nAudit errors (check logs):\n${errors.map((e) => `  - ${e}`).join('\n')}\n`
        : ''

    const headline = `Data retention audit — ${runDate}`
    const textBody = [
      headline,
      '',
      textRows,
      '',
      `Total records flagged: ${total}`,
      errorBlock,
      'No records have been automatically deleted.',
      'Log into the Otters admin panel and review before taking any action.',
      '',
      adminUrl,
      emailSupportTextBlock(),
    ].join('\n')

    const totalColor = total > 0 ? '#DC2626' : '#059669'
    const errorHtml =
      errors.length > 0
        ? `<ul style="margin:8px 0 0;padding-left:18px;color:#b91c1c;font-size:13px;font-family:system-ui,sans-serif;">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
        : ''

    const bodyHtml = [
      emailParagraph(
        `The monthly retention check found <strong style="color:${totalColor};">${total} record${total !== 1 ? 's' : ''}</strong> that ${total !== 1 ? 'have' : 'has'} exceeded ${total !== 1 ? 'their' : 'its'} policy retention window.`
      ),
      emailDataTable({ headers: ['Category', 'Count'], rows }),
      errorHtml
        ? emailHighlightBox({
            title: 'Audit errors — check server logs',
            bodyHtml: errorHtml,
            variant: 'warning',
          })
        : '',
      emailHighlightBox({
        title: 'No records have been automatically deleted.',
        bodyHtml:
          'Review each category in the admin panel and take action manually. Records should be deleted or anonymised only after confirming they are no longer legally required.',
      }),
    ].join('')

    const htmlBody = buildOttersEmailHtml({
      preheader: `${total} record${total !== 1 ? 's' : ''} past retention window`,
      headline,
      category: 'Report',
      bodyHtml,
      ctaLabel: 'Open admin panel',
      ctaUrl: adminUrl,
    })

    const result = await smtp2goSend({
      to,
      subject: `[Otters] Data Retention Audit — ${runDate} (${total} flagged)`,
      textBody,
      htmlBody,
    })

    return {
      success: result.ok,
      ...(result.skipped ? { skipped: true } : {}),
      ...(result.emailId ? { emailId: result.emailId } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    }
  } catch (error) {
    console.error('sendRetentionAuditEmail error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function staffHubUrl(hubPath) {
  const origin = emailPublicOrigin()
  const path = hubPath?.startsWith('/') ? hubPath : `/${hubPath || ''}`
  return `${origin}${path}`
}

export async function smtp2goSendStaffNotification({
  to,
  recipientName,
  subject,
  body,
  hubPath = '/login',
}) {
  const hubUrl = staffHubUrl(hubPath)
  const notifSubject = subject || 'Otters Swim Hub notification'
  const safeBody = body ? escapeHtml(body) : ''

  const textBody = buildOttersEmailText({
    recipientName: recipientName || 'there',
    headline: subject || 'You have a new notification in Otters Swim Hub.',
    bodyLines: body ? [body] : [],
    ctaUrl: hubUrl,
  })

  const htmlBody = buildOttersEmailHtml({
    preheader: subject || 'New notification',
    recipientName: recipientName || 'there',
    category: 'Notification',
    headline: subject || 'You have a new notification',
    bodyHtml: safeBody ? emailParagraph(safeBody, { muted: true }) : '',
    ctaLabel: 'View notifications',
    ctaUrl: hubUrl,
  })

  return smtp2goSend({
    to,
    subject: notifSubject,
    textBody,
    htmlBody,
  })
}
