import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parentFeedbackHasAdminReadAtColumn } from '@/lib/parent/parent-feedback-read-at'

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
  return { user, supabase }
}

export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const hasAdminReadAt = await parentFeedbackHasAdminReadAtColumn(auth.supabase)
  const now = new Date().toISOString()

  let feedbackId = null
  try {
    const body = await request.json()
    feedbackId = typeof body?.feedbackId === 'string' ? body.feedbackId : null
  } catch {
    /* mark all */
  }

  let marked = 0
  if (hasAdminReadAt) {
    let query = auth.supabase
      .from('parent_feedback')
      .update({ admin_read_at: now })
      .eq('status', 'open')
      .is('admin_read_at', null)

    if (feedbackId) {
      query = query.eq('id', feedbackId)
    }

    const { data, error } = await query.select('id')
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    marked = data?.length ?? 0
  }

  const { data: staffRows, error: staffErr } = await auth.supabase
    .from('staff_notifications')
    .update({ read_at: now })
    .eq('recipient_id', auth.user.id)
    .eq('role', 'admin')
    .eq('type', 'parent_feedback_submitted')
    .is('read_at', null)
    .select('id')

  if (staffErr) {
    console.error('admin feedback mark-read staff_notifications:', staffErr.message)
  }

  return NextResponse.json({
    ok: true,
    marked,
    staffMarked: staffRows?.length ?? 0,
    skippedFeedbackColumn: !hasAdminReadAt,
  })
}
