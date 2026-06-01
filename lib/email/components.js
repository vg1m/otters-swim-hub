import { EMAIL_TOKENS } from './tokens.js'
import { escapeHtml } from './escape-html.js'

/**
 * Primary CTA button (bulletproof table wrapper for Outlook).
 */
export function emailButton({ href, label }) {
  const url = escapeHtml(href)
  const text = escapeHtml(label)
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 12px;">
  <tr>
    <td align="center">
      <a href="${url}" style="display:inline-block;background:${EMAIL_TOKENS.primary};color:#ffffff !important;padding:12px 28px;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;font-family:${EMAIL_TOKENS.fontFamily};">${text}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:13px;text-align:center;color:${EMAIL_TOKENS.textSubtle};font-family:${EMAIL_TOKENS.fontFamily};">
  Or open: <a href="${url}" style="color:${EMAIL_TOKENS.primary};text-decoration:underline;">${url}</a>
</p>`
}

/** Secondary link only (no button). */
export function emailLinkLine(href) {
  const url = escapeHtml(href)
  return `<p style="margin:0 0 16px;font-size:13px;text-align:center;color:${EMAIL_TOKENS.textSubtle};font-family:${EMAIL_TOKENS.fontFamily};">
  <a href="${url}" style="color:${EMAIL_TOKENS.primary};text-decoration:underline;">${url}</a>
</p>`
}

export function emailParagraph(html, { muted = false } = {}) {
  const color = muted ? EMAIL_TOKENS.textMuted : EMAIL_TOKENS.text
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${color};font-family:${EMAIL_TOKENS.fontFamily};">${html}</p>`
}

export function emailInfoBox(rows) {
  const rowsHtml = rows
    .map(
      ([label, valueHtml]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${EMAIL_TOKENS.border};font-size:14px;color:${EMAIL_TOKENS.textMuted};font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${EMAIL_TOKENS.border};font-size:14px;font-weight:600;text-align:right;color:${EMAIL_TOKENS.text};font-family:${EMAIL_TOKENS.fontFamily};">${valueHtml}</td>
    </tr>`
    )
    .join('')

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border:1px solid ${EMAIL_TOKENS.border};border-radius:${EMAIL_TOKENS.radiusBox};overflow:hidden;background:${EMAIL_TOKENS.card};">
  <tbody>${rowsHtml}</tbody>
</table>`
}

/**
 * Data table with optional header row (retention audit).
 * @param {{ headers?: [string, string], rows: [string, string | number][] }} opts
 */
export function emailDataTable({ headers, rows }) {
  const headHtml = headers
    ? `<thead>
      <tr style="background:${EMAIL_TOKENS.borderLight};">
        <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:${EMAIL_TOKENS.textSubtle};text-transform:uppercase;letter-spacing:0.05em;font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(headers[0])}</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:${EMAIL_TOKENS.textSubtle};text-transform:uppercase;letter-spacing:0.05em;font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(headers[1])}</th>
      </tr>
    </thead>`
    : ''

  const bodyHtml = rows
    .map(([label, count]) => {
      const n = Number(count)
      const countColor = n > 0 ? EMAIL_TOKENS.danger : EMAIL_TOKENS.text
      return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid ${EMAIL_TOKENS.border};font-size:14px;color:${EMAIL_TOKENS.textMuted};font-family:${EMAIL_TOKENS.fontFamily};">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid ${EMAIL_TOKENS.border};font-size:14px;font-weight:600;text-align:right;color:${countColor};font-family:${EMAIL_TOKENS.fontFamily};">${n}</td>
      </tr>`
    })
    .join('')

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border:1px solid ${EMAIL_TOKENS.border};border-radius:${EMAIL_TOKENS.radiusBox};overflow:hidden;">
  ${headHtml}
  <tbody>${bodyHtml}</tbody>
</table>`
}

export function emailHighlightBox({ title, bodyHtml, variant = 'info' }) {
  const bg = variant === 'warning' ? '#fef2f2' : EMAIL_TOKENS.primaryLight
  const border = variant === 'warning' ? '#fecaca' : EMAIL_TOKENS.primaryBorder
  const titleColor = variant === 'warning' ? '#991b1b' : '#1e3a8a'
  const bodyColor = variant === 'warning' ? '#b91c1c' : '#1d4ed8'
  return `
<div style="margin:16px 0;padding:16px;background:${bg};border:1px solid ${border};border-radius:${EMAIL_TOKENS.radiusBox};font-family:${EMAIL_TOKENS.fontFamily};">
  <p style="margin:0 0 6px;font-weight:600;color:${titleColor};font-size:14px;">${escapeHtml(title)}</p>
  <p style="margin:0;font-size:13px;color:${bodyColor};line-height:1.5;">${bodyHtml}</p>
</div>`
}

/** Monospace highlight for invite email address. */
export function emailMonospaceHighlight(text) {
  return `<p style="margin:0 0 16px;background:${EMAIL_TOKENS.card};padding:12px 16px;border-radius:${EMAIL_TOKENS.radiusBox};border:1px solid ${EMAIL_TOKENS.primary};font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;color:${EMAIL_TOKENS.text};">${escapeHtml(text)}</p>`
}
