import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parentFeedbackHasReadAtColumn } from '@/lib/parent/parent-feedback-read-at'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasReadAt = await parentFeedbackHasReadAtColumn(supabase)
  if (!hasReadAt) {
    return NextResponse.json({ ok: true, marked: 0, skipped: true })
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('parent_feedback')
    .update({ parent_read_at: now })
    .eq('status', 'answered')
    .is('parent_read_at', null)
    .not('admin_response', 'is', null)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, marked: data?.length ?? 0 })
}
