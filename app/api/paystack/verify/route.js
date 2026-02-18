import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyPaystackTransaction } from '@/lib/paystack/client'

export async function POST(request) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    console.log('Verifying payment:', reference)

    // Verify payment with Paystack
    const verification = await verifyPaystackTransaction(reference)
    
    console.log('Paystack verification response:', {
      success: verification.success,
      status: verification.status,
      amount: verification.amount,
      reference: verification.reference
    })

    if (!verification.success || verification.status !== 'success') {
      console.error('Payment verification failed:', {
        success: verification.success,
        status: verification.status,
        fullData: verification
      })
      
      return NextResponse.json(
        { 
          error: 'Payment not successful',
          status: verification.status || 'unknown',
          details: verification.raw_data?.gateway_response || 'No details available'
        },
        { status: 400 }
      )
    }

    console.log('Payment verified successfully:', verification)

    // Use service role client to update database (bypass RLS)
    const supabase = createServiceRoleClient()

    // Find payment record
    const { data: payment, error: paymentFetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('paystack_reference', reference)
      .single()

    if (paymentFetchError || !payment) {
      console.error('Payment not found:', paymentFetchError)
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // If already completed, return success
    if (payment.status === 'completed') {
      console.log('Payment already completed')
      return NextResponse.json({
        message: 'Payment already completed',
        invoice_id: payment.invoice_id,
        status: 'completed'
      })
    }

    // Update payment status
    console.log('Updating payment status...')
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: verification.paid_at || new Date().toISOString(),
        paystack_authorization_code: verification.authorization_code,
        payment_channel: verification.channel,
        callback_data: {
          ...payment.callback_data,
          verification_data: verification.raw_data,
          verified_at: new Date().toISOString(),
        },
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      console.error('Error updating payment:', paymentUpdateError)
      throw paymentUpdateError
    }

    // Update invoice status to 'paid'
    console.log('Updating invoice status to paid...')
    const { error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: verification.paid_at || new Date().toISOString(),
        transaction_reference: reference,
      })
      .eq('id', payment.invoice_id)

    if (invoiceUpdateError) {
      console.error('Error updating invoice:', invoiceUpdateError)
      throw invoiceUpdateError
    }

    // Generate receipt if not exists
    console.log('Checking for existing receipt...')
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id, receipt_number')
      .eq('payment_id', payment.id)
      .single()

    let receiptNumber = existingReceipt?.receipt_number

    if (!existingReceipt) {
      console.log('Generating new receipt...')
      const { data: receiptNumberData } = await supabase
        .rpc('generate_receipt_number')
        .single()
      
      receiptNumber = receiptNumberData || `REC-${Date.now()}-${payment.invoice_id.substring(0, 8)}`

      const { error: receiptError } = await supabase
        .from('receipts')
        .insert({
          invoice_id: payment.invoice_id,
          payment_id: payment.id,
          receipt_number: receiptNumber,
          receipt_data: {
            invoice_id: payment.invoice_id,
            payment_reference: reference,
            amount: verification.amount, // Already converted from kobo to KES
            currency: verification.currency,
            payment_channel: verification.channel,
            paid_at: verification.paid_at || new Date().toISOString(),
            customer: {
              email: verification.customer_email,
              name: payment.callback_data?.parentData?.full_name,
            },
          },
        })

      if (receiptError) {
        console.error('Error creating receipt:', receiptError)
      } else {
        console.log('Receipt created:', receiptNumber)
      }
    }

    // Approve swimmers (if registration invoice)
    let swimmerIds = payment.callback_data?.swimmers || []
    
    // If no swimmers in callback_data (e.g., payment via "Pay Now" button on existing invoice),
    // find swimmers by parent_id and invoice
    if (swimmerIds.length === 0) {
      console.log('No swimmers in callback_data, looking up by parent_id...')
      
      // Get the invoice to find parent_id
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('parent_id, swimmer_id')
        .eq('id', payment.invoice_id)
        .single()
      
      if (invoiceData?.parent_id) {
        // Find all pending swimmers for this parent
        const { data: swimmersData } = await supabase
          .from('swimmers')
          .select('id')
          .eq('parent_id', invoiceData.parent_id)
          .eq('status', 'pending')
        
        swimmerIds = swimmersData?.map(s => s.id) || []
        console.log(`Found ${swimmerIds.length} pending swimmers for parent via invoice`)
      }
      
      // If invoice has a specific swimmer_id, include it
      if (invoiceData?.swimmer_id && !swimmerIds.includes(invoiceData.swimmer_id)) {
        const { data: specificSwimmer } = await supabase
          .from('swimmers')
          .select('id, status')
          .eq('id', invoiceData.swimmer_id)
          .single()
        
        if (specificSwimmer?.status === 'pending') {
          swimmerIds.push(specificSwimmer.id)
          console.log('Added specific swimmer from invoice.swimmer_id')
        }
      }
    }
    
    if (swimmerIds.length > 0) {
      console.log('Approving swimmers:', swimmerIds)
      const { error: swimmerUpdateError } = await supabase
        .from('swimmers')
        .update({ status: 'approved' })
        .in('id', swimmerIds)

      if (swimmerUpdateError) {
        console.error('Error approving swimmers:', swimmerUpdateError)
      } else {
        console.log(`Approved ${swimmerIds.length} swimmers`)
      }
    } else {
      console.log('No swimmers found to approve for this payment')
    }

    return NextResponse.json({
      message: 'Payment verified and processed successfully',
      invoice_id: payment.invoice_id,
      receipt_number: receiptNumber,
      status: 'completed'
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { 
        error: 'Payment verification failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
