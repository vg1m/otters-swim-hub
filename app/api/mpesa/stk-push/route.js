import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateStkPush } from '@/lib/mpesa/stk-push'
import { CONSENT_POLICY_TEXT } from '@/components/ConsentPolicy'

export async function POST(request) {
  try {
    const body = await request.json()
    const { swimmers, parentInfo, totalAmount, consents, paymentOption } = body

    // Validate input
    if (!swimmers || swimmers.length === 0) {
      return NextResponse.json(
        { error: 'No swimmers provided' },
        { status: 400 }
      )
    }

    if (!parentInfo || !parentInfo.phone || !parentInfo.email || !parentInfo.fullName || !parentInfo.relationship) {
      return NextResponse.json(
        { error: 'Parent information incomplete' },
        { status: 400 }
      )
    }

    // Validate emergency contact
    if (!parentInfo.emergencyContactName || !parentInfo.emergencyContactRelationship || !parentInfo.emergencyContactPhone) {
      return NextResponse.json(
        { error: 'Emergency contact information incomplete' },
        { status: 400 }
      )
    }

    // Validate required consents
    if (!consents || !consents.dataAccuracy || !consents.codeOfConduct) {
      return NextResponse.json(
        { error: 'Required consents not provided' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const isPaying = paymentOption === 'pay_now'

    // Create a temporary parent profile (will be linked after signup)
    const tempParentData = {
      phone_number: parentInfo.phone,
      full_name: parentInfo.fullName,
      email: parentInfo.email,
      relationship: parentInfo.relationship,
      emergency_contact_name: parentInfo.emergencyContactName,
      emergency_contact_relationship: parentInfo.emergencyContactRelationship,
      emergency_contact_phone: parentInfo.emergencyContactPhone,
    }

    // Create invoice - status depends on payment option
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        parent_id: null, // Will be linked when parent signs up
        swimmer_id: null, // Multiple swimmers, will link later
        status: isPaying ? 'draft' : 'issued', // 'issued' for pay-later, 'draft' for pay-now
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
      registration_complete: true, // Form completed
      payment_deferred: !isPaying, // True if pay-later option selected
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

    // Store consent records for each swimmer (Kenya Data Protection Act compliance)
    const consentRecords = createdSwimmers.map(swimmer => ({
      parent_id: null, // Will be linked when parent signs up
      swimmer_id: swimmer.id,
      media_consent: consents.mediaConsent,
      code_of_conduct_consent: consents.codeOfConduct,
      data_accuracy_confirmed: consents.dataAccuracy,
      consent_text: CONSENT_POLICY_TEXT,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
    }))

    const { error: consentError } = await supabase
      .from('registration_consents')
      .insert(consentRecords)

    if (consentError) {
      console.error('Consent storage error:', consentError)
      // Don't fail registration if consent storage fails, but log it
    }

    // Handle pay-later flow (skip M-Pesa)
    if (!isPaying) {
      return NextResponse.json({
        success: true,
        message: 'Registration submitted successfully! Invoice sent to your email.',
        invoiceId: invoice.id,
        payLater: true,
      })
    }

    // Pay now flow - create payment record and initiate M-Pesa
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

    // Update payment with checkout request ID and metadata
    await supabase
      .from('payments')
      .update({
        callback_data: {
          checkoutRequestId: stkPushResult.checkoutRequestId,
          merchantRequestId: stkPushResult.merchantRequestId,
          parentEmail: parentInfo.email,
          parentData: tempParentData,
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
