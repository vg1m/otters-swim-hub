import { smtp2goSendStaffNotification } from '@/lib/utils/send-email'
import { staffNotificationsHubPath } from '@/lib/notifications/staff-notification-types'

function staffEmailEnabled() {
  if (process.env.STAFF_NOTIFICATIONS_EMAIL === '0') return false
  return Boolean(process.env.SMTP2GO_API_KEY?.trim())
}

/**
 * Send staff notification email and set emailed_at. Server-only; non-fatal.
 * @param {object} supabase Service role or admin client with update rights
 * @param {{ id: string, role: string, type: string, title: string, body?: string | null }} notification
 * @param {{ email: string, full_name?: string | null }} recipient
 */
export async function sendStaffNotificationEmail(supabase, notification, recipient) {
  if (!staffEmailEnabled()) return { sent: false, skipped: true }
  if (!notification?.id || !recipient?.email?.trim()) {
    return { sent: false, skipped: true }
  }

  const hubPath = staffNotificationsHubPath(notification.role)
  const result = await smtp2goSendStaffNotification({
    to: recipient.email.trim(),
    recipientName: recipient.full_name?.trim() || (notification.role === 'admin' ? 'Admin' : 'Coach'),
    subject: notification.title,
    body: notification.body,
    hubPath,
  })

  if (result.ok) {
    const { error } = await supabase
      .from('staff_notifications')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', notification.id)
    if (error) {
      console.error('sendStaffNotificationEmail: emailed_at update failed', error.message)
    }
    return { sent: true, emailId: result.emailId }
  }

  console.warn('sendStaffNotificationEmail failed (non-fatal):', result.error)
  return { sent: false, error: result.error }
}
