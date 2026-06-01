import { EMAIL_COMPANY_NAME, EMAIL_SUPPORT_ADDRESS, EMAIL_TOKENS } from './tokens.js'
import { escapeHtml } from './escape-html.js'

export const EMAIL_SUPPORT_PLACEHOLDER_TEXT = `\n\nSupport: ${EMAIL_SUPPORT_ADDRESS}\n`

/** Plain-text closing lines (company + optional Paystack). */
export function buildEmailTextFooter({ footerVariant = 'default' } = {}) {
  let out = EMAIL_SUPPORT_PLACEHOLDER_TEXT + EMAIL_COMPANY_NAME
  if (footerVariant === 'payment') {
    out += '\n\n---\nPayments secured by Paystack™'
  }
  return out
}

export function buildEmailFooterHtml({ footerVariant = 'default' } = {}) {
  const support = escapeHtml(EMAIL_SUPPORT_ADDRESS)
  const paystackLine =
    footerVariant === 'payment'
      ? `<p style="margin:12px 0 0;font-size:12px;color:${EMAIL_TOKENS.textSubtle};"><strong>Payments secured by Paystack™</strong></p>`
      : ''

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:20px 32px 28px;border-top:1px solid ${EMAIL_TOKENS.border};">
      <p style="margin:0 0 8px;font-size:12px;color:${EMAIL_TOKENS.textSubtle};line-height:1.5;">
        Support: <a href="mailto:${support}" style="color:${EMAIL_TOKENS.primary};text-decoration:none;">${support}</a>
      </p>
      <p style="margin:0;font-size:13px;color:${EMAIL_TOKENS.textSubtle};">${escapeHtml(EMAIL_COMPANY_NAME)}</p>
      ${paystackLine}
    </td>
  </tr>
</table>`
}
