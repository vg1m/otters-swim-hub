import { EMAIL_COMPANY_NAME, EMAIL_SUPPORT_ADDRESS, EMAIL_TOKENS } from './tokens.js'
import { escapeHtml } from './escape-html.js'

/** Set true to show the support address in transactional email footers. */
export const EMAIL_SUPPORT_VISIBLE_IN_EMAIL = false

export const EMAIL_SUPPORT_PLACEHOLDER_TEXT = `\n\nSupport: ${EMAIL_SUPPORT_ADDRESS}\n`

/** Plain-text support block (empty when hidden). */
export function emailSupportTextBlock() {
  return EMAIL_SUPPORT_VISIBLE_IN_EMAIL ? EMAIL_SUPPORT_PLACEHOLDER_TEXT : ''
}

/** HTML support line for footers (empty when hidden). */
export function emailSupportHtmlBlock() {
  if (!EMAIL_SUPPORT_VISIBLE_IN_EMAIL) return ''
  const support = escapeHtml(EMAIL_SUPPORT_ADDRESS)
  return `<p style="margin:0 0 8px;font-size:12px;text-align:center;color:${EMAIL_TOKENS.textSubtle};line-height:1.5;">
        Support: <a href="mailto:${support}" style="color:${EMAIL_TOKENS.primary};text-decoration:none;">${support}</a>
      </p>`
}

/** Plain-text closing lines (company + optional Paystack). */
export function buildEmailTextFooter({ footerVariant = 'default' } = {}) {
  let out = emailSupportTextBlock() + EMAIL_COMPANY_NAME
  if (footerVariant === 'payment') {
    out += '\n\n---\nPayments secured by Paystack™'
  }
  return out
}

export function buildEmailFooterHtml({ footerVariant = 'default' } = {}) {
  const paystackLine =
    footerVariant === 'payment'
      ? `<p style="margin:12px 0 0;font-size:12px;text-align:center;color:${EMAIL_TOKENS.textSubtle};"><strong>Payments secured by Paystack™</strong></p>`
      : ''

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:20px 32px 28px;border-top:1px solid ${EMAIL_TOKENS.border};text-align:center;">
      ${emailSupportHtmlBlock()}
      <p style="margin:0;font-size:13px;text-align:center;color:${EMAIL_TOKENS.textSubtle};">${escapeHtml(EMAIL_COMPANY_NAME)}</p>
      ${paystackLine}
    </td>
  </tr>
</table>`
}
