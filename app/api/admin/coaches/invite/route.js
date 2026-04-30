import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function normalizeEmail(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function siteOrigin() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    ''
  const trimmed = base.replace(/\/$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http')) return trimmed
  return `https://${trimmed}`
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
 * POST /api/admin/coaches/invite
 * Admin-only. Invites a new coach by email or promotes an existing parent account to coach.
 *
 * Body: { email: string, full_name: string, phone_number?: string }
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

  const origin = siteOrigin()
  /**
   * One path only (no "?next=" nested in redirect_to). Nested query strings on redirect_to break
   * how GoTrue merges the session (#access_token or ?code); next step defaults to set-password client-side.
   */
  const redirectTo = origin ? `${origin}/auth/finish-invite` : undefined

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
  }

  try {
    if (existingProfile?.role === 'parent') {
      await patchCoachProfile(existingProfile.id)
      return NextResponse.json({
        ok: true,
        mode: 'promoted',
        userId: existingProfile.id,
        message:
          'Existing account was upgraded to coach. They can sign in with their current credentials.',
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
    return NextResponse.json(
      { error: e?.message || 'Unexpected error creating coach' },
      { status: 500 }
    )
  }
}
