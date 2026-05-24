import { sendStaffNotificationEmail } from '@/lib/notifications/send-staff-notification-email'

/**
 * Insert a staff notification. Idempotent on (recipient_id, type, dedupe_key).
 * Never throws — failures are non-fatal.
 *
 * @param {object} supabase Supabase client (service role or admin JWT).
 * @param {{
 *   recipient_id: string,
 *   role: 'admin' | 'coach',
 *   type: string,
 *   title: string,
 *   body?: string,
 *   dedupe_key: string,
 *   swimmer_id?: string,
 *   session_id?: string,
 *   coach_assignment_id?: string,
 *   invoice_id?: string,
 *   sendEmail?: boolean,
 * }} payload
 * @returns {Promise<{ id?: string, inserted?: boolean }>}
 */
export async function insertStaffNotification(supabase, payload) {
  const {
    recipient_id,
    role,
    type,
    title,
    body,
    dedupe_key,
    swimmer_id,
    session_id,
    coach_assignment_id,
    invoice_id,
    sendEmail = false,
  } = payload || {}

  if (!recipient_id || !role || !type || !title || !dedupe_key) {
    console.warn('insertStaffNotification: missing required field — skipped')
    return { inserted: false }
  }

  try {
    const row = {
      recipient_id,
      role,
      type,
      title,
      body: body ?? null,
      dedupe_key,
      swimmer_id: swimmer_id ?? null,
      session_id: session_id ?? null,
      coach_assignment_id: coach_assignment_id ?? null,
      invoice_id: invoice_id ?? null,
    }

    const { data, error } = await supabase.from('staff_notifications').insert(row).select('id, role, type, title, body, emailed_at').maybeSingle()

    if (error) {
      if (error.code === '23505') {
        return { inserted: false }
      }
      console.error('insertStaffNotification DB error (non-fatal):', error.message)
      return { inserted: false }
    }

    if (!data?.id) {
      return { inserted: false }
    }

    if (sendEmail && !data.emailed_at) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', recipient_id)
        .maybeSingle()

      if (profile?.email) {
        await sendStaffNotificationEmail(supabase, data, profile)
      }
    }

    return { id: data.id, inserted: true }
  } catch (e) {
    console.error('insertStaffNotification threw (non-fatal):', e)
    return { inserted: false }
  }
}
