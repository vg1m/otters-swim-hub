import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendCoachSessionPayAdminReminderEmail } from '@/lib/utils/send-email'
import { getSessionEndUtc } from '@/lib/utils/session-timezone'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function adminNotifyEmail() {
  return (
    process.env.COACH_PAY_NOTIFY_EMAIL?.trim() ||
    process.env.SMTP2GO_FROM_EMAIL?.trim() ||
    null
  )
}

async function runCoachSessionPayJob() {
  const tz = process.env.APP_TIMEZONE || 'Africa/Nairobi'
  const now = new Date()
  const supabase = createServiceRoleClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 120)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: sessions, error: sessErr } = await supabase
    .from('training_sessions')
    .select('id, session_date, end_time, coach_id')
    .not('coach_id', 'is', null)
    .gte('session_date', cutoffStr)

  if (sessErr) {
    console.error('coach-session-pay: sessions query', sessErr)
    return { ok: false, error: sessErr.message, pendingCount: 0 }
  }

  const list = sessions || []
  if (list.length === 0) {
    return { ok: true, pendingCount: 0, reminded: false, message: 'No sessions in range' }
  }

  const coachIds = [...new Set(list.map((s) => s.coach_id))]
  const { data: coaches, error: coachErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, per_session_rate_kes')
    .in('id', coachIds)

  if (coachErr) {
    console.error('coach-session-pay: profiles query', coachErr)
    return { ok: false, error: coachErr.message, pendingCount: 0 }
  }

  const coachById = new Map((coaches || []).map((c) => [c.id, c]))

  const eligible = []
  for (const s of list) {
    const coach = coachById.get(s.coach_id)
    const rateRaw = coach?.per_session_rate_kes
    if (rateRaw == null || Number(rateRaw) <= 0) continue
    const rate = Number(rateRaw)
    const endUtc = getSessionEndUtc(s.session_date, s.end_time, tz)
    if (endUtc < now) {
      eligible.push({ session: s, coach, rate })
    }
  }

  if (eligible.length === 0) {
    return { ok: true, pendingCount: 0, reminded: false, message: 'No eligible sessions past end time' }
  }

  const sessionIds = eligible.map((e) => e.session.id)
  const { data: existingRows } = await supabase
    .from('coach_session_pay_events')
    .select('session_id')
    .in('session_id', sessionIds)

  const existing = new Set((existingRows || []).map((r) => r.session_id))
  const pending = eligible.filter((e) => !existing.has(e.session.id))

  if (pending.length === 0) {
    return { ok: true, pendingCount: 0, reminded: false, message: 'All eligible sessions already have pay lines' }
  }

  const to = adminNotifyEmail()
  let reminded = false

  if (to) {
    const pendingRows = pending
      .map(({ session, coach, rate }) => ({
        sessionDate:
          typeof session.session_date === 'string'
            ? session.session_date.slice(0, 10)
            : String(session.session_date),
        coachName: coach.full_name || coach.email || 'Coach',
        amountKes: rate,
      }))
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))

    const emailResult = await sendCoachSessionPayAdminReminderEmail({
      to,
      pending: pendingRows,
    })
    reminded = !!emailResult.success
    if (!emailResult.success && !emailResult.skipped) {
      console.error('coach-session-pay: admin reminder email failed', emailResult.error)
    }
  } else {
    console.warn(
      'coach-session-pay: no admin email configured (set COACH_PAY_NOTIFY_EMAIL or SMTP2GO_FROM_EMAIL)'
    )
  }

  return {
    ok: true,
    pendingCount: pending.length,
    reminded,
    message: reminded
      ? `Admin reminder sent for ${pending.length} session(s)`
      : `${pending.length} session(s) pending pay lines (no admin email sent)`,
  }
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return unauthorized()
  }

  try {
    const result = await runCoachSessionPayJob()
    return NextResponse.json(result)
  } catch (e) {
    console.error('coach-session-pay cron', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
}
