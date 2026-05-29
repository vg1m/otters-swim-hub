import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { notifyParentCoachAssigned } from '@/lib/notifications/notify-parent-coach-assigned'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
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

  return { admin: createServiceRoleClient() }
}

export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const swimmerId = typeof body?.swimmer_id === 'string' ? body.swimmer_id.trim() : ''
  const coachId =
    typeof body?.coach_id === 'string' && body.coach_id.trim()
      ? body.coach_id.trim()
      : null

  if (!swimmerId) {
    return NextResponse.json({ error: 'swimmer_id is required' }, { status: 400 })
  }

  const result = await notifyParentCoachAssigned(auth.admin, {
    swimmerId,
    coachId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Failed to send notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, skipped: Boolean(result.skipped) })
}
