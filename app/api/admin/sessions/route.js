import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { buildRecurrencePattern } from '@/lib/utils/recurrence'
import { notifySessionScheduleChange } from '@/lib/notifications/notify-session-schedule-change'

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

/**
 * POST /api/admin/sessions — create training session + squad links (admin only).
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

  const sessionDate = typeof body?.session_date === 'string' ? body.session_date.trim() : ''
  const startTime = typeof body?.start_time === 'string' ? body.start_time.trim() : ''
  const endTime = typeof body?.end_time === 'string' ? body.end_time.trim() : ''
  const poolLocation = typeof body?.pool_location === 'string' ? body.pool_location.trim() : ''
  const facilityId = typeof body?.facility_id === 'string' ? body.facility_id.trim() : null
  const coachId = typeof body?.coach_id === 'string' ? body.coach_id.trim() : null
  const squadIds = Array.isArray(body?.squad_ids)
    ? body.squad_ids.filter((id) => typeof id === 'string' && id.trim())
    : []
  const isRecurring = Boolean(body?.is_recurring)
  const recurrencePattern = body?.recurrence_pattern ?? null
  const recurrenceEndDate =
    isRecurring && typeof body?.recurrence_end_date === 'string' && body.recurrence_end_date.trim()
      ? body.recurrence_end_date.trim()
      : null

  if (!sessionDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'Date, start time, and end time are required' }, { status: 400 })
  }
  if (!poolLocation && !facilityId) {
    return NextResponse.json({ error: 'Pool location or facility is required' }, { status: 400 })
  }
  if (squadIds.length === 0) {
    return NextResponse.json({ error: 'At least one squad is required' }, { status: 400 })
  }
  if (isRecurring && recurrenceEndDate && recurrenceEndDate < sessionDate) {
    return NextResponse.json(
      { error: 'Recurrence end date must be on or after the session start date' },
      { status: 400 }
    )
  }

  let pattern = recurrencePattern
  if (isRecurring && pattern && typeof pattern === 'object' && !pattern.type && body?.recurrence_type) {
    pattern = buildRecurrencePattern(body.recurrence_type, body.recurrence_options || {})
  }

  const admin = createServiceRoleClient()

  const { data: newSession, error: sessionError } = await admin
    .from('training_sessions')
    .insert({
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      pool_location: poolLocation || 'TBD',
      facility_id: facilityId || null,
      coach_id: coachId || auth.user.id,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? pattern : null,
      recurrence_end_date: recurrenceEndDate,
    })
    .select('id')
    .single()

  if (sessionError) {
    console.error('admin sessions create:', sessionError)
    return NextResponse.json(
      { error: sessionError.message || 'Failed to create session' },
      { status: 500 }
    )
  }

  const { error: squadError } = await admin.from('training_session_squads').insert(
    squadIds.map((squad_id) => ({ session_id: newSession.id, squad_id }))
  )

  if (squadError) {
    console.error('admin sessions squads:', squadError)
    await admin.from('training_sessions').delete().eq('id', newSession.id)
    return NextResponse.json(
      { error: squadError.message || 'Failed to link squads to session' },
      { status: 500 }
    )
  }

  void notifySessionScheduleChange(admin, {
    sessionId: newSession.id,
    changeKind: 'session_created',
    squadIds,
  }).catch((e) => console.warn('session create notify (non-fatal):', e))

  return NextResponse.json({ session: { id: newSession.id } }, { status: 201 })
}
