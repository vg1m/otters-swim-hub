import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendCoachSessionPayEmail } from '@/lib/utils/send-email'
import { getSessionEndUtc } from '@/lib/utils/session-timezone'
import { formatInTimeZone } from 'date-fns-tz'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return { ok: false, error: sessErr.message, processed: 0 }
  }

  const list = sessions || []
  if (list.length === 0) {
    return { ok: true, processed: 0, message: 'No sessions in range' }
  }

  const coachIds = [...new Set(list.map((s) => s.coach_id))]
  const { data: coaches, error: coachErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, per_session_rate_kes')
    .in('id', coachIds)

  if (coachErr) {
    console.error('coach-session-pay: profiles query', coachErr)
    return { ok: false, error: coachErr.message, processed: 0 }
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
    return { ok: true, processed: 0, message: 'No eligible sessions past end time' }
  }

  const sessionIds = eligible.map((e) => e.session.id)
  const { data: existingRows } = await supabase
    .from('coach_session_pay_events')
    .select('session_id')
    .in('session_id', sessionIds)

  const existing = new Set((existingRows || []).map((r) => r.session_id))
  const pending = eligible.filter((e) => !existing.has(e.session.id))

  let processed = 0
  const notifyCc = process.env.COACH_PAY_NOTIFY_EMAIL || null

  for (const row of pending) {
    const { session, coach, rate } = row
    const endUtc = getSessionEndUtc(session.session_date, session.end_time, tz)
    const sessionDateStr =
      typeof session.session_date === 'string'
        ? session.session_date.slice(0, 10)
        : String(session.session_date)
    const sessionEndLocal = formatInTimeZone(endUtc, tz, 'yyyy-MM-dd HH:mm')

    const { error: insErr } = await supabase.from('coach_session_pay_events').insert({
      session_id: session.id,
      coach_id: coach.id,
      amount_kes: rate,
      rate_snapshot_kes: rate,
    })

    if (insErr) {
      console.error('coach-session-pay: insert', insErr)
      continue
    }

    processed += 1
    const coachEmail = coach.email
    if (coachEmail) {
      await sendCoachSessionPayEmail({
        coachEmail,
        coachName: coach.full_name || 'Coach',
        amountKes: rate,
        sessionDate: sessionDateStr,
        sessionEndLocal,
        notifyCc,
      })
    }
  }

  return { ok: true, processed, pendingCount: pending.length }
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
