import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendParentFeedbackResponseEmail } from '@/lib/notifications/send-parent-feedback-response-email'
import { parentFeedbackHasReadAtColumn } from '@/lib/parent/parent-feedback-read-at'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function POST(request, { params }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const adminResponse = typeof body?.admin_response === 'string' ? body.admin_response.trim() : ''
  if (!adminResponse) {
    return NextResponse.json({ error: 'Response is required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { data: existing, error: loadErr } = await admin
    .from('parent_feedback')
    .select('id, parent_id, subject, status')
    .eq('id', id)
    .maybeSingle()

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const hasReadAt = await parentFeedbackHasReadAtColumn(admin)
  const patch = {
    admin_response: adminResponse,
    responded_by: auth.user.id,
    responded_at: new Date().toISOString(),
    status: 'answered',
  }
  if (hasReadAt) {
    patch.parent_read_at = null
  }

  let { data: row, error } = await admin
    .from('parent_feedback')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sendParentFeedbackResponseEmail(admin, {
    parentId: existing.parent_id,
    subject: existing.subject,
    adminResponse,
  })

  return NextResponse.json({ ok: true, feedback: row })
}
