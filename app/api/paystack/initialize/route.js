import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { initializePaystackTransaction, generatePaymentReference } from '@/lib/paystack/client'
import { CONSENT_POLICY_TEXT } from '@/lib/constants/consent-policy'

export async function POST(request) {
  try {
    const body = await request.json()
    const { swimmers, parentInfo, totalAmount, consents, paymentOption } = body

    console.log('Payment initialization request received:', {
      swimmers: swimmers?.length,
      parentInfo: parentInfo?.email,
      totalAmount,
      paymentOption,
    })

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

    const supabase = createServiceRoleClient()
    const isPaying = paymentOption === 'pay_now'

    // CRITICAL FIX: Check if parent email already has an account
    // If yes, link swimmers directly instead of creating orphaned records
    let parentId = null
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parentInfo.email)
      .single()
    
    if (existingProfile) {
      parentId = existingProfile.id
      console.log('✅ Parent account found:', parentInfo.email, '- Will link swimmers directly')
    } else {
      console.log('ℹ️ No parent account found - swimmers will be orphaned until signup')
    }

    // Create invoice
    console.log('Creating invoice...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        parent_id: parentId, // Link immediately if account exists
        swimmer_id: null, // Multiple swimmers, will link later
        status: isPaying ? 'draft' : 'issued', // 'issued' for pay-later, 'draft' for pay-now
        total_amount: totalAmount,
        payment_method: 'paystack',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to create invoice', details: invoiceError.message },
        { status: 500 }
      )
    }

    console.log('Invoice created:', invoice.id)

    // Store swimmers temporarily (status: pending)
    const swimmersToInsert = swimmers.map(swimmer => ({
      parent_id: parentId, // Link immediately if account exists
      first_name: swimmer.firstName,
      last_name: swimmer.lastName,
      date_of_birth: swimmer.dateOfBirth,
      gender: swimmer.gender,
      squad: swimmer.squad,
      status: 'pending',
      registration_complete: true, // Form completed
      payment_deferred: !isPaying, // True if pay-later option selected
    }))

    console.log('Creating swimmers...')
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

    console.log(`Created ${createdSwimmers.length} swimmers`)

    // Update invoice with first swimmer's ID for easier querying
    if (createdSwimmers.length > 0) {
      await supabase
        .from('invoices')
        .update({ swimmer_id: createdSwimmers[0].id })
        .eq('id', invoice.id)
    }

    // Add invoice line items
    const lineItems = swimmers.map((swimmer, index) => ({
      invoice_id: invoice.id,
      description: `Registration: ${swimmer.firstName} ${swimmer.lastName}`,
      amount: 3500, // Registration fee per swimmer
      quantity: 1,
    }))

    await supabase.from('invoice_line_items').insert(lineItems)

    // Store consent records for each swimmer (Kenya Data Protection Act compliance)
    console.log('Preparing to store consent records...')
    console.log('Consent values:', consents)
    console.log('CONSENT_POLICY_TEXT available:', !!CONSENT_POLICY_TEXT)
    
    const consentRecords = createdSwimmers.map(swimmer => ({
      parent_id: parentId, // Link immediately if account exists, otherwise null
      swimmer_id: swimmer.id,
      media_consent: consents.mediaConsent,
      code_of_conduct_consent: consents.codeOfConduct,
      data_accuracy_confirmed: consents.dataAccuracy,
      consent_text: CONSENT_POLICY_TEXT,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
    }))

    console.log('Inserting consent records:', consentRecords.length)
    console.log('Sample consent record:', JSON.stringify(consentRecords[0], null, 2))
    
    const { data: insertedConsents, error: consentError } = await supabase
      .from('registration_consents')
      .insert(consentRecords)
      .select()

    if (consentError) {
      console.error('❌ CRITICAL: Consent storage failed:', {
        error: consentError,
        code: consentError.code,
        message: consentError.message,
        details: consentError.details,
        hint: consentError.hint,
      })
      
      // FAIL THE REGISTRATION - consents are MANDATORY
      return NextResponse.json(
        { 
          error: 'Failed to store consent records',
          details: 'Registration cannot proceed without consent storage. Please try again or contact support.',
          technicalDetails: consentError.message
        },
        { status: 500 }
      )
    }

    // Verify consents were actually saved
    if (!insertedConsents || insertedConsents.length !== consentRecords.length) {
      console.error('🚨 CRITICAL: Consent count mismatch!', {
        expected: consentRecords.length,
        actual: insertedConsents?.length || 0
      })
      
      return NextResponse.json(
        { 
          error: 'Consent verification failed',
          details: 'Registration data incomplete. Please try again or contact support.'
        },
        { status: 500 }
      )
    }

    console.log('✅ Consent records stored successfully:', insertedConsents.length)
    console.log('✅ Inserted consent IDs:', insertedConsents.map(c => c.id))
    
    // DOUBLE-CHECK: Verify data persists by querying back
    const { data: verifyConsents, error: verifyError } = await supabase
      .from('registration_consents')
      .select('id, swimmer_id, created_at')
      .in('id', insertedConsents.map(c => c.id))
    
    if (verifyError || !verifyConsents || verifyConsents.length !== insertedConsents.length) {
      console.error('🚨 CRITICAL: Consent verification failed!', {
        verifyError,
        expected: insertedConsents.length,
        found: verifyConsents?.length || 0
      })
      
      return NextResponse.json(
        { 
          error: 'Consent data verification failed',
          details: 'Registration cannot be completed. Please contact support immediately.',
          supportInfo: 'Consent records could not be verified in database'
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Verification: All', verifyConsents.length, 'consents confirmed in database')

    // Create payment record (both pay now AND pay later need this for linking!)
    console.log(isPaying ? 'Initializing Paystack payment...' : 'Creating payment record for pay-later...')
    const paymentReference = generatePaymentReference('REG', invoice.id)
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        phone_number: parentInfo.phone,
        amount: totalAmount,
        status: 'pending',
        paystack_reference: paymentReference,
        callback_data: {
          parentEmail: parentInfo.email,
          parentData: {
            full_name: parentInfo.fullName,
            phone_number: parentInfo.phone,
            email: parentInfo.email,
            relationship: parentInfo.relationship,
            emergency_contact_name: parentInfo.emergencyContactName,
            emergency_contact_relationship: parentInfo.emergencyContactRelationship,
            emergency_contact_phone: parentInfo.emergencyContactPhone,
          },
          swimmers: createdSwimmers.map(s => s.id),
        },
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

    // Handle pay-later flow (return early, skip Paystack initialization)
    if (!isPaying) {
      console.log('Pay later option selected - payment record created for linking')
      return NextResponse.json({
        success: true,
        message: 'Registration submitted successfully! You can pay later from your dashboard.',
        invoiceId: invoice.id,
        payLater: true,
      })
    }

    // Initialize Paystack transaction
    const paystackResult = await initializePaystackTransaction({
      email: parentInfo.email,
      amount: totalAmount,
      reference: paymentReference,
      metadata: {
        invoice_id: invoice.id,
        payment_id: payment.id,
        parent_name: parentInfo.fullName,
        parent_phone: parentInfo.phone,
        parent_email: parentInfo.email,
        payment_description: `Swimmer Registration - ${swimmers.length} swimmer(s)`,
        swimmers: createdSwimmers.map(s => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          squad: s.squad,
        })),
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/register/confirmation?invoiceId=${invoice.id}&reference=${paymentReference}`,
    })

    // Update payment record with Paystack-specific details
    await supabase
      .from('payments')
      .update({
        callback_data: {
          ...payment.callback_data, // Keep existing parent data
          access_code: paystackResult.access_code,
        },
      })
      .eq('id', payment.id)

    console.log('Paystack initialization successful:', {
      reference: paymentReference,
      authorization_url: paystackResult.authorization_url,
    })

    return NextResponse.json({
      success: true,
      authorization_url: paystackResult.authorization_url,
      reference: paystackResult.reference,
      invoiceId: invoice.id,
      paymentId: payment.id,
      message: 'Payment initialized successfully',
    })
  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Payment initialization failed',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
