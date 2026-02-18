import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializePaystackTransaction, generatePaymentReference } from '@/lib/paystack/client'

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
        swimmers (id, first_name, last_name, squad),
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

    if (invoice.parent_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to pay this invoice' },
        { status: 403 }
      )
    }

    // Generate unique payment reference
    const paymentReference = generatePaymentReference('INV', invoice.id)

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        phone_number: invoice.profiles?.phone_number || '',
        amount: invoice.total_amount,
        status: 'pending',
        paystack_reference: paymentReference,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Prepare swimmer data for metadata
    const swimmerData = invoice.swimmers 
      ? (Array.isArray(invoice.swimmers) ? invoice.swimmers : [invoice.swimmers])
      : []

    // Initialize Paystack transaction
    const paystackResult = await initializePaystackTransaction({
      email: invoice.profiles?.email || user.email,
      amount: invoice.total_amount,
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
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices?reference=${paymentReference}&paid=true`,
    })

    // Store Paystack access code in payment callback data
    await supabase
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
