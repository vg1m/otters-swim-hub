import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { initializePaystackTransaction, generatePaymentReference } from '@/lib/paystack/client'
import { computeInvoiceEarlyBirdPayAdjustments } from '@/lib/invoices/invoice-early-bird-pay'

/**
 * Initialize payment for an existing invoice
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get invoice details with parent and swimmer information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        swimmers (id, first_name, last_name, squad_id, squads (name, early_bird_eligible)),
        profiles (id, full_name, email, phone_number),
        invoice_line_items (*)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      )
    }

    // Check if invoice belongs to authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: canPay, error: accessError } = await supabase.rpc(
      'auth_user_can_access_parent_data',
      { target_parent_id: invoice.parent_id }
    )
    if (accessError || !canPay) {
      return NextResponse.json(
        { error: 'Unauthorized to pay this invoice' },
        { status: 403 }
      )
    }

    // Payments INSERT is restricted to admin/service_role in RLS; use service role
    // after we have verified the authenticated user may pay this invoice (primary or linked co-parent).
    const supabaseAdmin = createServiceRoleClient()

    const { chargedAmount, earlyBirdApplied, earlyBirdDiscount } =
      computeInvoiceEarlyBirdPayAdjustments(invoice)

    let callbackOrigin
    try {
      callbackOrigin = new URL(request.url).origin
    } catch {
      callbackOrigin =
        typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
          ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
          : ''
    }
    if (!callbackOrigin.startsWith('http')) {
      return NextResponse.json(
        { error: 'Could not determine app URL for Paystack redirect' },
        { status: 500 }
      )
    }

    // Generate unique payment reference
    const paymentReference = generatePaymentReference('INV', invoice.id)

    // Create payment record — store the actual charged amount (may differ from invoice total)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        phone_number: invoice.profiles?.phone_number || '',
        amount: chargedAmount,
        status: 'pending',
        paystack_reference: paymentReference,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      return NextResponse.json(
        { error: paymentError.message || 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Prepare swimmer data for metadata
    const swimmerData = invoice.swimmers 
      ? (Array.isArray(invoice.swimmers) ? invoice.swimmers : [invoice.swimmers])
      : []

    // Initialize Paystack transaction with the (possibly discounted) amount
    const paystackResult = await initializePaystackTransaction({
      email: invoice.profiles?.email || user.email,
      amount: chargedAmount,
      reference: paymentReference,
      metadata: {
        invoice_id: invoice.id,
        payment_id: payment.id,
        parent_name: invoice.profiles?.full_name,
        parent_phone: invoice.profiles?.phone_number,
        parent_email: invoice.profiles?.email,
        payment_description: `Invoice Payment - ${swimmerData.length} swimmer(s)`,
        swimmers: swimmerData.map(s => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          squad: s.squad,
        })),
      },
      callback_url: `${callbackOrigin}/invoices?reference=${encodeURIComponent(
        paymentReference
      )}&paid=true`,
    })

    // Store Paystack access code in payment callback data
    await supabaseAdmin
      .from('payments')
      .update({
        callback_data: {
          access_code: paystackResult.access_code,
          parentEmail: invoice.profiles?.email,
          swimmers: swimmerData.map(s => s.id),
        },
      })
      .eq('id', payment.id)

    console.log('Invoice payment initialized:', {
      invoiceId: invoice.id,
      reference: paymentReference,
    })

    return NextResponse.json({
      success: true,
      authorization_url: paystackResult.authorization_url,
      reference: paystackResult.reference,
      invoiceId: invoice.id,
      paymentId: payment.id,
      earlyBirdApplied,
      earlyBirdDiscount,
      chargedAmount,
    })
  } catch (error) {
    console.error('Invoice payment initialization error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to initialize payment',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
