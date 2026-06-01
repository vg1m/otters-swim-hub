import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertHcaptcha } from '@/lib/hcaptcha/verify-token'
import { resolvePrimaryParentId } from '@/lib/parent/resolve-primary-parent-id'
import { parentFeedbackHasReadAtColumn } from '@/lib/parent/parent-feedback-read-at'
import { notifyAllAdmins } from '@/lib/notifications/notify-all-admins'

const FEEDBACK_SELECT_BASE =
  'id, subject, message, status, admin_response, responded_at, created_at, submitted_by, parent_id'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parentId = await resolvePrimaryParentId(supabase, user.id)
  const hasReadAt = await parentFeedbackHasReadAtColumn(supabase)
  const select = hasReadAt ? `${FEEDBACK_SELECT_BASE}, parent_read_at` : FEEDBACK_SELECT_BASE

  const { data, error } = await supabase
    .from('parent_feedback')
    .select(select)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const feedback = (data || []).map((row) => ({
    ...row,
    parent_read_at: hasReadAt ? row.parent_read_at : row.responded_at ?? row.created_at,
  }))

  return NextResponse.json({ feedback, unreadRepliesEnabled: hasReadAt })
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'parent') {
    return NextResponse.json({ error: 'Only parent accounts can submit feedback' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const captchaError = await assertHcaptcha(request, body)
  if (captchaError) {
    return NextResponse.json({ error: captchaError.error }, { status: captchaError.status })
  }

  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const parentId = await resolvePrimaryParentId(supabase, user.id)

  const { data: row, error } = await supabase
    .from('parent_feedback')
    .insert({
      parent_id: parentId,
      submitted_by: user.id,
      subject,
      message,
      status: 'open',
    })
    .select('id, subject')
    .single()

  if (error) {
    console.error('parent_feedback insert:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const adminClient = createServiceRoleClient()
  await notifyAllAdmins(adminClient, {
    type: 'parent_feedback_submitted',
    title: `Parent feedback: ${subject}`,
    body: message.slice(0, 500),
    dedupe_key: `parent_feedback:${row.id}`,
    sendEmail: true,
  })

  return NextResponse.json({ ok: true, feedback: row })
}
