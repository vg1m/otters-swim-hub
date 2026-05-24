import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'

/**
 * POST /api/admin/staff-notifications/dispatch
 * Admin-only: insert staff notification + optional email (server-side SMTP).
 */
export async function POST(request) {
  try {
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const recipient_id = typeof body?.recipient_id === 'string' ? body.recipient_id.trim() : ''
    const role = body?.role === 'coach' || body?.role === 'admin' ? body.role : null
    const type = typeof body?.type === 'string' ? body.type.trim() : ''
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const dedupe_key = typeof body?.dedupe_key === 'string' ? body.dedupe_key.trim() : ''

    if (!recipient_id || !role || !type || !title || !dedupe_key) {
      return NextResponse.json({ error: 'Missing required notification fields' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const result = await insertStaffNotification(admin, {
      recipient_id,
      role,
      type,
      title,
      body: typeof body?.body === 'string' ? body.body : undefined,
      dedupe_key,
      swimmer_id: typeof body?.swimmer_id === 'string' ? body.swimmer_id : undefined,
      session_id: typeof body?.session_id === 'string' ? body.session_id : undefined,
      coach_assignment_id: typeof body?.coach_assignment_id === 'string' ? body.coach_assignment_id : undefined,
      invoice_id: typeof body?.invoice_id === 'string' ? body.invoice_id : undefined,
      sendEmail: body?.sendEmail !== false,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('staff-notifications/dispatch:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
