import { sendInvoiceEmail } from '@/lib/utils/send-email'

/** Human-readable invoice reference (matches receipts / Paystack copy). */
export function formatInvoiceNumber(invoiceId) {
  if (!invoiceId || typeof invoiceId !== 'string') return '—'
  return `INV-${invoiceId.substring(0, 8).toUpperCase()}`
}

function formatDueDate(iso) {
  if (!iso) return 'See invoice'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'See invoice'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Load invoice + parent and send issued-invoice email. Server-only (SMTP env).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} svc Service-role client
 * @param {string} invoiceId
 * @returns {Promise<{ ok: boolean, message?: string, skipped?: boolean, error?: string }>}
 */
export async function sendIssuedInvoiceEmailForInvoiceId(svc, invoiceId) {
  if (!invoiceId) {
    return { ok: false, error: 'Missing invoice id' }
  }

  const { data: inv, error: invErr } = await svc
    .from('invoices')
    .select(`
      id,
      parent_id,
      swimmer_id,
      total_amount,
      due_date,
      status,
      swimmers ( id, first_name, last_name )
    `)
    .eq('id', invoiceId)
    .maybeSingle()

  if (invErr) {
    console.error('sendIssuedInvoiceEmailForInvoiceId: invoice read', invErr)
    return { ok: false, error: invErr.message }
  }
  if (!inv) {
    return { ok: false, error: 'Invoice not found' }
  }

  if (!['issued', 'due'].includes(inv.status)) {
    return { ok: false, skipped: true, message: 'Invoice not in a payable status; email skipped' }
  }

  const { data: parent, error: pErr } = await svc
    .from('profiles')
    .select('email, full_name')
    .eq('id', inv.parent_id)
    .maybeSingle()

  if (pErr) {
    console.error('sendIssuedInvoiceEmailForInvoiceId: profile read', pErr)
    return { ok: false, error: pErr.message }
  }

  const to = typeof parent?.email === 'string' ? parent.email.trim() : ''
  if (!to) {
    return { ok: false, skipped: true, message: 'No parent email on file; invoice email skipped' }
  }

  const swimmerRows = Array.isArray(inv.swimmers) ? inv.swimmers : inv.swimmers ? [inv.swimmers] : []
  const swimmers =
    swimmerRows.length > 0
      ? swimmerRows.map((s) => ({
          name: [s.first_name, s.last_name].filter(Boolean).join(' ').trim(),
        }))
      : []

  const invoiceNumber = formatInvoiceNumber(inv.id)
  const result = await sendInvoiceEmail({
    to,
    invoiceNumber,
    amount: Number(inv.total_amount ?? 0),
    dueDate: formatDueDate(inv.due_date),
    parentName: parent?.full_name?.trim() || 'Parent',
    swimmers,
  })

  if (!result.success) {
    console.warn('sendIssuedInvoiceEmailForInvoiceId: SMTP2GO', result.message || result.error)
    return { ok: false, error: result.error || result.message || 'Email send failed' }
  }

  return { ok: true, message: result.message || 'Invoice email sent' }
}
