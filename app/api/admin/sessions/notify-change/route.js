import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { notifySessionScheduleChange } from '@/lib/notifications/notify-session-schedule-change'

const VALID_KINDS = new Set([
  'session_created',
  'session_series_updated',
  'session_occurrence_updated',
  'session_occurrence_cancelled',
  'session_deleted',
])

/**
 * POST /api/admin/sessions/notify-change
 * Admin-only: notify parents and coaches after a session mutation.
 */
export async function POST(request) {
  const supabaseUser = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileErr } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const changeKind = typeof body?.changeKind === 'string' ? body.changeKind.trim() : ''
  const occurrenceDate =
    typeof body?.occurrenceDate === 'string' && body.occurrenceDate.trim()
      ? body.occurrenceDate.trim().slice(0, 10)
      : null
  const squadIds = Array.isArray(body?.squadIds)
    ? body.squadIds.filter((id) => typeof id === 'string' && id.trim())
    : null

  const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    sessionId
  )
  if (!sessionId || !uuidOk) {
    return NextResponse.json({ error: 'A valid sessionId is required' }, { status: 400 })
  }
  if (!VALID_KINDS.has(changeKind)) {
    return NextResponse.json({ error: 'Invalid changeKind' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleClient()
    const result = await notifySessionScheduleChange(admin, {
      sessionId,
      changeKind,
      occurrenceDate,
      squadIds,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('sessions/notify-change:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
