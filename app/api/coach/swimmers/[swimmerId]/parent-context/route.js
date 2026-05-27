import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isSwimmerInCoachScope } from '@/lib/coach/coach-swimmer-in-scope'
import { fetchParentAccountContext } from '@/lib/parent/parent-account-context'

export async function GET(_request, { params }) {
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

  if (profile?.role !== 'coach' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { swimmerId } = await params
  const admin = createServiceRoleClient()

  if (profile?.role === 'coach') {
    const inScope = await isSwimmerInCoachScope(admin, user.id, swimmerId)
    if (!inScope) {
      return NextResponse.json({ error: 'Swimmer not in your coaching scope' }, { status: 403 })
    }
  }

  const { data: swimmer, error: sErr } = await admin
    .from('swimmers')
    .select('parent_id')
    .eq('id', swimmerId)
    .maybeSingle()

  if (sErr || !swimmer?.parent_id) {
    return NextResponse.json({ error: 'Swimmer not found' }, { status: 404 })
  }

  const parentContext = await fetchParentAccountContext(admin, swimmer.parent_id)
  return NextResponse.json({ parentContext })
}
