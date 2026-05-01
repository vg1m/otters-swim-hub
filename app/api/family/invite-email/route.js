import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendFamilySharedAccessInviteEmail } from '@/lib/utils/send-email'

/**
 * POST /api/family/invite-email
 * Body: { inviteId: string } — must be a pending family_account_members row owned by the signed-in primary parent.
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const inviteId = typeof body?.inviteId === 'string' ? body.inviteId.trim() : ''
    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    const { data: inv, error: invErr } = await supabase
      .from('family_account_members')
      .select('id, primary_parent_id, invited_email, invited_name, status')
      .eq('id', inviteId)
      .maybeSingle()

    if (invErr) {
      console.error('invite-email: load invite', invErr)
      return NextResponse.json({ error: 'Could not load invitation' }, { status: 500 })
    }
    if (!inv) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (inv.primary_parent_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (inv.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invitations can be emailed' }, { status: 400 })
    }

    const { data: primaryProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const primaryName =
      primaryProfile?.full_name?.trim() || primaryProfile?.email?.trim() || user.email || 'Otters parent'
    const primaryEmail = primaryProfile?.email?.trim() || user.email || ''

    const sendResult = await sendFamilySharedAccessInviteEmail({
      inviteeEmail: inv.invited_email,
      inviteeName: inv.invited_name,
      primaryName,
      primaryEmail,
    })

    if (sendResult.success) {
      return NextResponse.json({ sent: true, emailId: sendResult.emailId ?? null })
    }

    if (sendResult.skipped) {
      return NextResponse.json(
        {
          sent: false,
          skipped: true,
          error: sendResult.error || 'Email not configured',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        sent: false,
        error: sendResult.error || 'Failed to send email',
      },
      { status: 502 }
    )
  } catch (e) {
    console.error('invite-email route:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    )
  }
}
