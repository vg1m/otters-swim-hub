import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * POST /api/admin/coaches/remove
 * Admin-only. Permanently deletes a coach auth user + profile when they have no assignments.
 * Body: { coach_id: string }
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const coachId = typeof body?.coach_id === 'string' ? body.coach_id.trim() : ''
  if (!coachId) {
    return NextResponse.json({ error: 'coach_id is required' }, { status: 400 })
  }

  const supabaseUser = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile, error: profileErr } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr || callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    console.error('coach remove: service role', e)
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { data: coachProfile, error: coachErr } = await admin
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', coachId)
    .maybeSingle()

  if (coachErr || !coachProfile) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
  }

  if (coachProfile.role !== 'coach') {
    return NextResponse.json({ error: 'User is not a coach' }, { status: 400 })
  }

  const [{ count: assignmentCount }, { count: directSwimmers }] = await Promise.all([
    admin
      .from('coach_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId),
    admin
      .from('swimmers')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId),
  ])

  if ((assignmentCount ?? 0) > 0 || (directSwimmers ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          'Coach still has assignments or swimmers. Remove assignments first, or use Remove to demote to parent.',
      },
      { status: 409 }
    )
  }

  await admin.from('training_sessions').update({ coach_id: null }).eq('coach_id', coachId)

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(coachId)
  if (deleteAuthError) {
    console.error('coach remove: auth delete', deleteAuthError)
    return NextResponse.json(
      { error: deleteAuthError.message || 'Failed to delete auth user' },
      { status: 500 }
    )
  }

  const { error: deleteProfileError } = await admin.from('profiles').delete().eq('id', coachId)
  if (deleteProfileError) {
    console.error('coach remove: profile delete', deleteProfileError)
    return NextResponse.json(
      { error: deleteProfileError.message || 'Auth user removed but profile delete failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: `Deleted coach account for ${coachProfile.full_name || coachProfile.email}`,
  })
}
