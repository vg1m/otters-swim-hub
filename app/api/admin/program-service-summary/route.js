import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Whole-program aggregates for Admin → Coaches → Service & pay summary card.
 * DB function is executable only by service_role; this route verifies an admin JWT first.
 */
export async function GET() {
  const supabaseUser = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile, error: profileReadError } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileReadError || callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let svc
  try {
    svc = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const { data, error } = await svc.rpc('admin_program_service_summary')
  if (error) {
    console.error('admin_program_service_summary:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? {})
}
