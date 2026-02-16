import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateStkPush } from '@/lib/mpesa/stk-push'

export async function POST(request) {
  try {
    const body = await request.json()
    const { swimmers, parentInfo, totalAmount } = body

    // Validate input
    if (!swimmers || swimmers.length === 0) {
      return NextResponse.json(
        { error: 'No swimmers provided' },
        { status: 400 }
      )
    }

    if (!parentInfo || !parentInfo.phone || !parentInfo.email || !parentInfo.fullName) {
      return NextResponse.json(
        { error: 'Parent information incomplete' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create a temporary parent profile (will be linked after signup)
    const tempParentData = {
      phone_number: parentInfo.phone,
      full_name: parentInfo.fullName,
      email: parentInfo.email,
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        parent_id: null, // Will be linked when parent signs up
        swimmer_id: null, // Multiple swimmers, will link later
        status: 'draft',
        total_amount: totalAmount,
        payment_method: 'mpesa',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
    }

    // Store swimmers temporarily (status: pending)
    const swimmersToInsert = swimmers.map(swimmer => ({
      parent_id: null, // Will be linked when parent signs up
      first_name: swimmer.firstName,
      last_name: swimmer.lastName,
      date_of_birth: swimmer.dateOfBirth,
      gender: swimmer.gender,
      squad: swimmer.squad,
      status: 'pending',
    }))

    const { data: createdSwimmers, error: swimmersError } = await supabase
      .from('swimmers')
      .insert(swimmersToInsert)
      .select()

    if (swimmersError) {
      console.error('Swimmers creation error:', swimmersError)
      return NextResponse.json(
        { error: 'Failed to create swimmer records' },
        { status: 500 }
      )
    }

    // Add invoice line items
    const lineItems = swimmers.map(swimmer => ({
      invoice_id: invoice.id,
      description: `Registration: ${swimmer.firstName} ${swimmer.lastName}`,
      amount: 3500,
      quantity: 1,
    }))

    await supabase.from('invoice_line_items').insert(lineItems)

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        phone_number: parentInfo.phone,
        amount: totalAmount,
        status: 'pending',
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

    // Initiate M-Pesa STK Push
    const stkPushResult = await initiateStkPush({
      phoneNumber: parentInfo.phone,
      amount: totalAmount,
      accountReference: `REG-${invoice.id.substring(0, 8)}`,
      transactionDesc: `Swimmer Registration - ${swimmers.length} swimmer(s)`,
    })

    // Update payment with checkout request ID
    await supabase
      .from('payments')
      .update({
        callback_data: {
          checkoutRequestId: stkPushResult.checkoutRequestId,
          merchantRequestId: stkPushResult.merchantRequestId,
          parentEmail: parentInfo.email,
          swimmers: createdSwimmers.map(s => s.id),
        },
      })
      .eq('id', payment.id)

    return NextResponse.json({
      success: true,
      message: stkPushResult.customerMessage,
      checkoutRequestId: stkPushResult.checkoutRequestId,
      invoiceId: invoice.id,
      paymentId: payment.id,
    })
  } catch (error) {
    console.error('STK Push route error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment initiation failed' },
      { status: 500 }
    )
  }
}
