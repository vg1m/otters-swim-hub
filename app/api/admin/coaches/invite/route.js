import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getAuthRedirectOrigin } from '@/lib/utils/public-origin'

function normalizeEmail(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Find auth user id by email (paginated). Used when profile row is missing but auth user exists.
 */
async function findAuthUserIdByEmail(adminAuth, email, maxPages = 25) {
  let page = 1
  const perPage = 200
  while (page <= maxPages) {
    const { data, error } = await adminAuth.listUsers({ page, perPage })
    if (error) break
    const list = data?.users ?? []
    const hit = list.find((u) => (u.email || '').toLowerCase() === email)
    if (hit?.id) return hit.id
    if (!data?.nextPage) break
    page += 1
  }
  return null
}

/**
 * Assign head coach for a squad: profile.coach_squad_id + squad-level coach_assignments row.
 */
async function assignCoachPrimarySquad(admin, coachId, squadId) {
  const { data: squad, error: squadErr } = await admin
    .from('squads')
    .select('id, name')
    .eq('id', squadId)
    .maybeSingle()

  if (squadErr || !squad) {
    throw new Error('Invalid or inactive squad')
  }

  const { data: existingHead, error: headErr } = await admin
    .from('coach_assignments')
    .select('coach_id, profiles(full_name)')
    .eq('squad_id', squadId)
    .is('swimmer_id', null)
    .maybeSingle()

  if (headErr) {
    console.error('coach invite: squad head lookup', headErr)
    throw new Error('Failed to verify squad head coach')
  }

  if (existingHead && existingHead.coach_id !== coachId) {
    const name = existingHead.profiles?.full_name || 'another coach'
    const err = new Error(
      `${squad.name} already has head coach ${name}. Remove or reassign them first.`
    )
    err.status = 409
    throw err
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ coach_squad_id: squadId, updated_at: new Date().toISOString() })
    .eq('id', coachId)

  if (profileErr) {
    console.error('coach invite: coach_squad_id', profileErr)
    throw new Error(profileErr.message || 'Failed to set primary squad')
  }

  await admin
    .from('coach_assignments')
    .delete()
    .eq('coach_id', coachId)
    .is('swimmer_id', null)

  if (existingHead?.coach_id === coachId) {
    return
  }

  const { error: insertErr } = await admin.from('coach_assignments').insert({
    coach_id: coachId,
    squad_id: squadId,
    swimmer_id: null,
  })

  if (insertErr) {
    console.error('coach invite: squad assignment', insertErr)
    throw new Error(insertErr.message || 'Failed to create squad head assignment')
  }
}

/**
 * POST /api/admin/coaches/invite
 * Admin-only. Invites a new coach by email or promotes an existing parent account to coach.
 *
 * Body: { email: string, full_name: string, phone_number?: string, coach_squad_id: string }
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = normalizeEmail(body?.email)
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const phoneNumber =
    typeof body?.phone_number === 'string' && body.phone_number.trim()
      ? body.phone_number.trim()
      : null

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }

  const coachSquadId =
    typeof body?.coach_squad_id === 'string' ? body.coach_squad_id.trim() : ''
  if (!coachSquadId) {
    return NextResponse.json({ error: 'Primary squad is required' }, { status: 400 })
  }

  const supabaseUser = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile, error: profileReadError } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileReadError || callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    console.error('coach invite: service role client', e)
    return NextResponse.json(
      { error: 'Server configuration error (service role)' },
      { status: 500 }
    )
  }

  const { data: existingProfile, error: existingErr } = await admin
    .from('profiles')
    .select('id, role, email, full_name')
    .ilike('email', email)
    .maybeSingle()

  if (existingErr) {
    console.error('coach invite: profile lookup', existingErr)
    return NextResponse.json({ error: 'Failed to look up profile' }, { status: 500 })
  }

  if (existingProfile?.role === 'admin') {
    return NextResponse.json(
      { error: 'This email belongs to an administrator. Coach invite is not allowed.' },
      { status: 403 }
    )
  }

  if (existingProfile?.role === 'coach') {
    return NextResponse.json(
      { error: 'This person is already a coach.' },
      { status: 409 }
    )
  }

  const origin = getAuthRedirectOrigin(request)
  /**
   * One path only (no "?next=" nested in redirect_to). Nested query strings on redirect_to break
   * how GoTrue merges the session (#access_token or ?code); next step defaults to set-password client-side.
   */
  const redirectTo = `${origin}/auth/finish-invite`

  const patchCoachProfile = async (userId) => {
    const { error: upErr } = await admin
      .from('profiles')
      .update({
        role: 'coach',
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (upErr) {
      console.error('coach invite: profile coach update', upErr)
      throw new Error(upErr.message || 'Failed to set coach role on profile')
    }

    await assignCoachPrimarySquad(admin, userId, coachSquadId)
  }

  try {
    if (existingProfile?.role === 'parent') {
      await patchCoachProfile(existingProfile.id)
      return NextResponse.json({
        ok: true,
        mode: 'promoted',
        userId: existingProfile.id,
        message:
          'Existing account was upgraded to coach with primary squad assigned. They can sign in with their current credentials.',
      })
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, phone_number: phoneNumber },
      redirectTo,
    })

    if (inviteError) {
      const msg = inviteError.message || String(inviteError)
      const lower = msg.toLowerCase()
      if (
        lower.includes('already') ||
        lower.includes('registered') ||
        lower.includes('exists') ||
        inviteError.status === 422
      ) {
        const orphanId = await findAuthUserIdByEmail(admin.auth.admin, email)
        if (!orphanId) {
          return NextResponse.json(
            {
              error:
                'Could not invite this email (account may already exist). Try again or contact support.',
              details: msg,
            },
            { status: 409 }
          )
        }
        await admin.from('profiles').upsert(
          {
            id: orphanId,
            full_name: fullName,
            email,
            phone_number: phoneNumber,
            role: 'coach',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        await patchCoachProfile(orphanId)
        return NextResponse.json({
          ok: true,
          mode: 'linked',
          userId: orphanId,
          message:
            'Linked an existing auth account to coach. Ask them to use password reset if they cannot sign in.',
        })
      }

      console.error('coach invite: inviteUserByEmail', inviteError)
      return NextResponse.json({ error: msg || 'Invite failed' }, { status: 400 })
    }

    const newUser = invited?.user
    if (!newUser?.id) {
      return NextResponse.json({ error: 'Invite succeeded but no user id returned' }, { status: 500 })
    }

    await patchCoachProfile(newUser.id)

    return NextResponse.json({
      ok: true,
      mode: 'invited',
      userId: newUser.id,
      message: 'Invite email sent. The coach should check their inbox to accept and set a password.',
    })
  } catch (e) {
    console.error('coach invite:', e)
    const status = e?.status === 409 ? 409 : 500
    return NextResponse.json(
      { error: e?.message || 'Unexpected error creating coach' },
      { status }
    )
  }
}
