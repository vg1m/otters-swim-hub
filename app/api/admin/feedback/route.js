import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parentFeedbackHasAdminReadAtColumn } from '@/lib/parent/parent-feedback-read-at'

const FEEDBACK_LIST_BASE =
  'id, parent_id, submitted_by, subject, message, status, admin_response, responded_at, created_at'

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

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const admin = createServiceRoleClient()
  const hasAdminReadAt = await parentFeedbackHasAdminReadAtColumn(admin)
  const select = hasAdminReadAt ? `${FEEDBACK_LIST_BASE}, admin_read_at` : FEEDBACK_LIST_BASE

  const { data, error } = await admin
    .from('parent_feedback')
    .select(select)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sorted = [...(data || [])].sort((a, b) => {
    const rank = (s) => (s === 'open' ? 0 : s === 'answered' ? 1 : 2)
    const d = rank(a.status) - rank(b.status)
    if (d !== 0) return d
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const feedback = (sorted || []).map((row) => ({
    ...row,
    admin_read_at: hasAdminReadAt ? row.admin_read_at : row.created_at,
  }))

  return NextResponse.json({ feedback, unreadEnabled: hasAdminReadAt })
}
