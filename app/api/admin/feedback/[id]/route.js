import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { fetchParentAccountContext } from '@/lib/parent/parent-account-context'

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

export async function GET(_request, { params }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const admin = createServiceRoleClient()

  const { data: row, error } = await admin
    .from('parent_feedback')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parentContext = await fetchParentAccountContext(admin, row.parent_id, {
    submittedById: row.submitted_by,
  })

  return NextResponse.json({ feedback: row, parentContext })
}
