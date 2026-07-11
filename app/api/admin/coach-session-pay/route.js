import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { recordCoachSessionPay } from '@/lib/coach/record-coach-session-pay'
import { getSessionEndUtc } from '@/lib/utils/session-timezone'
import { formatInTimeZone } from 'date-fns-tz'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

function parsePositiveAmount(raw) {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(/,/g, '').trim())
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

/**
 * POST /api/admin/coach-session-pay — record a coach session pay line (admin only).
 * Body: { sessionId, coachId, amountKes }
 */
export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const coachId = typeof body?.coachId === 'string' ? body.coachId.trim() : ''
  const amountKes = parsePositiveAmount(body?.amountKes)

  if (!sessionId || !coachId || amountKes == null) {
    return NextResponse.json(
      { error: 'sessionId, coachId, and a positive amountKes are required' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const tz = process.env.APP_TIMEZONE || 'Africa/Nairobi'

  const { data: session, error: sessErr } = await supabase
    .from('training_sessions')
    .select('id, session_date, end_time')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessErr) {
    return NextResponse.json({ error: sessErr.message }, { status: 500 })
  }
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const sessionDateStr =
    typeof session.session_date === 'string'
      ? session.session_date.slice(0, 10)
      : String(session.session_date)
  const endUtc = getSessionEndUtc(session.session_date, session.end_time, tz)
  const sessionEndLocal = formatInTimeZone(endUtc, tz, 'yyyy-MM-dd HH:mm')

  const notifyCc = process.env.COACH_PAY_NOTIFY_EMAIL || null

  const result = await recordCoachSessionPay(supabase, {
    sessionId,
    coachId,
    amountKes,
    rateSnapshotKes: amountKes,
    sessionDate: sessionDateStr,
    sessionEndLocal,
    notifyCc,
  })

  if (result.duplicate) {
    return NextResponse.json(
      { ok: false, duplicate: true, error: 'A pay line for this session already exists.' },
      { status: 409 }
    )
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not record pay line' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, payEvent: result.payEvent })
}
