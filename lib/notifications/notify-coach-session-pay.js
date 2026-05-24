import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'

/**
 * In-app notification when a coach session pay line is recorded. Email skipped (cron sends pay stub separately).
 * @param {object} supabase
 * @param {{ coachId: string, sessionId: string, amountKes: number, sessionDateLabel?: string }} params
 */
export async function notifyCoachSessionPayRecorded(supabase, { coachId, sessionId, amountKes, sessionDateLabel }) {
  const amount = Number(amountKes)
  const datePart = sessionDateLabel ? ` for ${sessionDateLabel}` : ''
  return insertStaffNotification(supabase, {
    recipient_id: coachId,
    role: 'coach',
    type: 'session_pay_recorded',
    title: `Session pay recorded${datePart}`,
    body: amount > 0 ? `KES ${amount.toLocaleString()} has been recorded for your coached session.` : 'A pay line was recorded for your coached session.',
    dedupe_key: `session_pay:${sessionId}`,
    session_id: sessionId,
    sendEmail: false,
  })
}
