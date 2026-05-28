import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isBillingSimulateAllowed,
  parseSimulateAsOf,
} from '@/lib/billing/billing-simulate'
import { runRecurringBillingJob } from '@/lib/billing/run-recurring-billing-job'

/**
 * Admin-only: run recurring billing as if on a given date (dev / ALLOW_BILLING_SIMULATE=1).
 * POST body: { "asOf": "2026-08" | "2026-08-25" }
 */
export async function POST(request) {
  if (!isBillingSimulateAllowed()) {
    return NextResponse.json(
      { error: 'Billing simulation is disabled in this environment' },
      { status: 403 }
    )
  }

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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const asOfRaw = typeof body?.asOf === 'string' ? body.asOf.trim() : ''
  const issueDate = parseSimulateAsOf(asOfRaw)
  if (!issueDate) {
    return NextResponse.json(
      { error: 'asOf is required (YYYY-MM-DD or YYYY-MM; month uses the 25th)' },
      { status: 400 }
    )
  }

  try {
    const result = await runRecurringBillingJob(issueDate, { force: true })
    return NextResponse.json(result)
  } catch (e) {
    console.error('admin billing simulate', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
