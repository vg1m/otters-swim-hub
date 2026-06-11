import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateInviteEmails } from '@/lib/family/validate-invite-emails'
import { canManageFamilyInvites } from '@/lib/family/can-manage-family-invites'
import { sendFamilySharedAccessInviteEmail } from '@/lib/utils/send-email'

/**
 * POST /api/family/invites
 * Body: { invites: [{ email, name? }, ...] } — max 10, all-or-nothing validation
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('family/invites: profile load', profileError)
      return NextResponse.json({ error: 'Could not load profile' }, { status: 500 })
    }

    const allowed = await canManageFamilyInvites(supabase, user.id, profile?.role)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Only the primary parent account can send shared access invitations.' },
        { status: 403 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const invites = Array.isArray(body?.invites) ? body.invites : []
    const primaryEmail = (profile?.email || user.email || '').trim()

    const { valid, errors } = await validateInviteEmails(supabase, {
      primaryUserId: user.id,
      primaryEmail,
      invites,
    })

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    const rows = valid.map((row) => ({
      primary_parent_id: user.id,
      invited_email: row.email,
      invited_name: row.name,
      status: 'pending',
      invited_by: user.id,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('family_account_members')
      .insert(rows)
      .select('id, invited_email, invited_name')

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            errors: [{ email: '', message: 'One or more emails are already invited on your account.' }],
          },
          { status: 400 }
        )
      }
      console.error('family/invites: insert', insertError)
      return NextResponse.json({ error: 'Could not create invitations' }, { status: 500 })
    }

    const primaryName =
      profile?.full_name?.trim() || profile?.email?.trim() || user.email || 'Otters parent'

    let emailed = 0
    const skippedEmail = []

    for (const inv of inserted || []) {
      const sendResult = await sendFamilySharedAccessInviteEmail({
        inviteeEmail: inv.invited_email,
        inviteeName: inv.invited_name,
        primaryName,
        primaryEmail,
      })
      if (sendResult.success) {
        emailed += 1
      } else {
        skippedEmail.push(inv.invited_email)
      }
    }

    return NextResponse.json({
      created: inserted?.length ?? 0,
      emailed,
      skippedEmail,
    })
  } catch (e) {
    console.error('family/invites route:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    )
  }
}
