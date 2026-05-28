import { insertNotification } from '@/lib/notifications/insert-notification'
import { sendIssuedInvoiceEmailForInvoiceId } from '@/lib/invoices/send-issued-invoice-email'
import { formatInClubTz } from '@/lib/billing/billing-timezone'

/**
 * In-app notification + optional SMTP email after an invoice is issued.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ invoiceId: string, parentId: string, swimmerId: string, swimmerFirstName: string, dueDateIso: string, sendEmail?: boolean }} params
 */
export async function issueInvoiceNotifications(supabase, {
  invoiceId,
  parentId,
  swimmerId,
  swimmerFirstName,
  dueDateIso,
  sendEmail = true,
}) {
  const dueDateLabel = dueDateIso
    ? formatInClubTz(dueDateIso, 'd MMMM yyyy')
    : 'See invoice'

  await insertNotification(supabase, {
    parent_id: parentId,
    type: 'invoice_issued',
    title: `New invoice for ${swimmerFirstName}`,
    body: `An invoice has been issued. Please pay by ${dueDateLabel}.`,
    swimmer_id: swimmerId,
    invoice_id: invoiceId,
  })

  if (sendEmail) {
    const emailResult = await sendIssuedInvoiceEmailForInvoiceId(supabase, invoiceId)
    if (!emailResult.ok && !emailResult.skipped) {
      console.warn('[issueInvoiceNotifications] email', emailResult.error || emailResult.message)
    }
  }
}
