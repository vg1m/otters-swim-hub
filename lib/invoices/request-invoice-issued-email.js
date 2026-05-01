/**
 * Ask the server to email the parent for an issued invoice (browser; uses admin session cookie).
 * Non-blocking for product flows — logs only on failure.
 *
 * @param {string | undefined} invoiceId
 */
export async function requestInvoiceIssuedEmailNotification(invoiceId) {
  if (!invoiceId || typeof invoiceId !== 'string') return

  try {
    const res = await fetch('/api/admin/invoices/send-issued-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ invoiceId: invoiceId.trim() }),
    })
    let json = {}
    try {
      json = await res.json()
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      console.error('[invoice email]', res.status, json?.error || res.statusText)
      return
    }
    if (json.skipped || json.ok === false) {
      console.warn('[invoice email]', json.message || json.error || 'skipped')
    }
  } catch (e) {
    console.error('[invoice email] request failed', e)
  }
}
