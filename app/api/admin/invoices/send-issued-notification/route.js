import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendIssuedInvoiceEmailForInvoiceId } from '@/lib/invoices/send-issued-invoice-email'

/** Require admin JWT; sends issued-invoice email to parent via SMTP2GO (server env). */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId.trim() : ''
  const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    invoiceId
  )
  if (!invoiceId || !uuidOk) {
    return NextResponse.json({ error: 'A valid invoiceId is required' }, { status: 400 })
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

  let svc
  try {
    svc = createServiceRoleClient()
  } catch (e) {
    console.error('send-issued-notification: service role', e)
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const emailed = await sendIssuedInvoiceEmailForInvoiceId(svc, invoiceId)

  if (emailed.skipped) {
    return NextResponse.json({ ok: false, skipped: true, message: emailed.message })
  }

  if (!emailed.ok) {
    const status = emailed.error === 'Invoice not found' ? 404 : 500
    return NextResponse.json({ ok: false, error: emailed.error || 'Failed to send' }, { status })
  }

  return NextResponse.json({ ok: true, message: emailed.message })
}
