import {
  EMAIL_PRODUCT_NAME,
  EMAIL_TOKENS,
} from './tokens.js'
import { escapeHtml } from './escape-html.js'
import { getEmailLogoUrl } from './origin.js'
import { buildEmailFooterHtml, buildEmailTextFooter } from './footer.js'

/**
 * @typedef {'default' | 'payment'} EmailFooterVariant
 */

/**
 * @param {{
 *   preheader?: string,
 *   recipientName?: string,
 *   greeting?: string,
 *   useDear?: boolean,
 *   category?: string,
 *   headline: string,
 *   bodyHtml?: string,
 *   ctaLabel?: string,
 *   ctaUrl?: string,
 *   footerVariant?: EmailFooterVariant,
 * }} opts
 */
export function buildOttersEmailHtml(opts) {
  const {
    preheader = '',
    recipientName = '',
    greeting,
    useDear = false,
    category = '',
    headline,
    bodyHtml = '',
    ctaLabel,
    ctaUrl,
    footerVariant = 'default',
  } = opts

  const logoUrl = escapeHtml(getEmailLogoUrl())
  const safeHeadline = escapeHtml(headline)
  const safeCategory = category ? escapeHtml(category) : ''
  const preheaderText = escapeHtml((preheader || headline).slice(0, 120))

  const namePart = recipientName ? escapeHtml(recipientName) : ''
  let greetingLine
  if (greeting) {
    greetingLine = escapeHtml(greeting)
  } else if (useDear && namePart) {
    greetingLine = `Dear ${namePart},`
  } else if (namePart) {
    greetingLine = `Hello <strong style="color:${EMAIL_TOKENS.text};">${namePart}</strong>,`
  } else {
    greetingLine = 'Hello,'
  }

  const categoryBlock = safeCategory
    ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_TOKENS.textSubtle};font-family:${EMAIL_TOKENS.fontFamily};">${safeCategory}</p>`
    : ''

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 12px;">
  <tr>
    <td align="center">
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${EMAIL_TOKENS.primary};color:#ffffff !important;padding:12px 28px;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(ctaLabel)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:13px;text-align:center;color:${EMAIL_TOKENS.textSubtle};font-family:${EMAIL_TOKENS.fontFamily};">
  Or open: <a href="${escapeHtml(ctaUrl)}" style="color:${EMAIL_TOKENS.primary};text-decoration:underline;">${escapeHtml(ctaUrl)}</a>
</p>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeHeadline}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_TOKENS.canvas};font-family:${EMAIL_TOKENS.fontFamily};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheaderText}&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_TOKENS.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="${EMAIL_TOKENS.maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${EMAIL_TOKENS.maxWidth}px;width:100%;background:${EMAIL_TOKENS.card};border-radius:${EMAIL_TOKENS.radiusCard};border:1px solid ${EMAIL_TOKENS.border};overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;background:${EMAIL_TOKENS.canvas};border-bottom:1px solid ${EMAIL_TOKENS.border};text-align:center;">
              <img src="${logoUrl}" width="120" height="auto" alt="${escapeHtml(EMAIL_PRODUCT_NAME)}" style="display:block;margin:0 auto 12px;max-width:120px;height:auto;border:0;" />
              <p style="margin:0;font-size:18px;font-weight:700;color:${EMAIL_TOKENS.text};font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(EMAIL_PRODUCT_NAME)}</p>
              ${categoryBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:${EMAIL_TOKENS.textMuted};font-family:${EMAIL_TOKENS.fontFamily};">${greetingLine}</p>
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;line-height:1.35;color:${EMAIL_TOKENS.text};font-family:${EMAIL_TOKENS.fontFamily};">${safeHeadline}</p>
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${buildEmailFooterHtml({ footerVariant })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Standard plain-text body for transactional emails.
 * @param {{
 *   recipientName?: string,
 *   greetingLine?: string,
 *   headline: string,
 *   bodyLines?: string[],
 *   ctaUrl?: string,
 *   footerVariant?: EmailFooterVariant,
 * }} opts
 */
export function buildOttersEmailText(opts) {
  const {
    recipientName,
    greetingLine,
    headline,
    bodyLines = [],
    ctaUrl,
    footerVariant = 'default',
  } = opts

  const greet =
    greetingLine ||
    (recipientName ? `Dear ${recipientName},` : 'Hello,') ||
    'Hello,'

  const parts = [
    greet,
    '',
    headline,
    ...bodyLines.flatMap((line) => (line === '' ? [''] : ['', line])),
    ...(ctaUrl ? ['', ctaUrl] : []),
    buildEmailTextFooter({ footerVariant }),
  ]

  return parts.join('\n')
}
