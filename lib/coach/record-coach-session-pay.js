import { notifyCoachSessionPayRecorded } from '@/lib/notifications/notify-coach-session-pay'
import { sendCoachSessionPayEmail } from '@/lib/utils/send-email'

function isDuplicateKeyError(error) {
  if (!error) return false
  if (error.code === '23505') return true
  return /duplicate key|unique constraint/i.test(String(error.message || ''))
}

/**
 * Insert a coach session pay line and notify the coach (in-app + email).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function recordCoachSessionPay(
  supabase,
  {
    sessionId,
    coachId,
    amountKes,
    rateSnapshotKes,
    sessionDate,
    sessionEndLocal,
    notifyCc,
  }
) {
  const amount = Number(amountKes)
  const snapshot = Number(rateSnapshotKes ?? amountKes)
  if (!sessionId || !coachId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Invalid session, coach, or amount' }
  }

  const sessionDateStr =
    sessionDate == null
      ? undefined
      : typeof sessionDate === 'string'
        ? sessionDate.slice(0, 10)
        : String(sessionDate)

  const { data: payEvent, error: insErr } = await supabase
    .from('coach_session_pay_events')
    .insert({
      session_id: sessionId,
      coach_id: coachId,
      amount_kes: amount,
      rate_snapshot_kes: snapshot,
    })
    .select('id, session_id, coach_id, amount_kes, rate_snapshot_kes, created_at')
    .single()

  if (insErr) {
    if (isDuplicateKeyError(insErr)) {
      return { ok: false, duplicate: true }
    }
    return { ok: false, error: insErr.message || 'Could not record pay line' }
  }

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', coachId)
    .maybeSingle()

  await notifyCoachSessionPayRecorded(supabase, {
    coachId,
    sessionId,
    amountKes: amount,
    sessionDateLabel: sessionDateStr,
  })

  const cc = notifyCc && String(notifyCc).trim() ? String(notifyCc).trim() : null
  if (coachProfile?.email) {
    await sendCoachSessionPayEmail({
      coachEmail: coachProfile.email,
      coachName: coachProfile.full_name || 'Coach',
      amountKes: amount,
      sessionDate: sessionDateStr || 'N/A',
      sessionEndLocal: sessionEndLocal || sessionDateStr || 'N/A',
      notifyCc: cc,
    })
  }

  return { ok: true, payEvent }
}
