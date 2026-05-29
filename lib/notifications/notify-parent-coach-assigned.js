import { buildCoachAssignedParentNotification } from '@/lib/notifications/coach-assigned-parent-message'
import { insertNotification } from '@/lib/notifications/insert-notification'

/**
 * Notify a parent that their swimmer has an assigned coach (loads coach profile on server).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ swimmerId: string, coachId?: string | null }} params
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function notifyParentCoachAssigned(supabase, { swimmerId, coachId }) {
  if (!swimmerId) {
    return { ok: false, error: 'swimmerId is required' }
  }

  const { data: swimmer, error: swimmerErr } = await supabase
    .from('swimmers')
    .select('id, parent_id, first_name, last_name, coach_id')
    .eq('id', swimmerId)
    .maybeSingle()

  if (swimmerErr) {
    return { ok: false, error: swimmerErr.message }
  }
  if (!swimmer?.parent_id) {
    return { ok: true, skipped: true }
  }

  const resolvedCoachId = coachId ?? swimmer.coach_id
  if (!resolvedCoachId) {
    return { ok: true, skipped: true }
  }

  const { data: coach, error: coachErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number')
    .eq('id', resolvedCoachId)
    .maybeSingle()

  if (coachErr) {
    return { ok: false, error: coachErr.message }
  }

  const { title, body } = buildCoachAssignedParentNotification({
    swimmerFirstName: swimmer.first_name,
    swimmerLastName: swimmer.last_name,
    coach,
  })

  await insertNotification(supabase, {
    parent_id: swimmer.parent_id,
    type: 'coach_assigned',
    title,
    body,
    swimmer_id: swimmer.id,
  })

  return { ok: true }
}
