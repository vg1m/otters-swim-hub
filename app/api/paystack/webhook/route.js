import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyWebhookSignature } from '@/lib/paystack/client'

export async function POST(request) {
  try {
    // Get raw body and signature
    const signature = request.headers.get('x-paystack-signature')
    const body = await request.text()
    
    console.log('Webhook received from Paystack')

    // Verify webhook signature for security
    if (!signature) {
      console.error('No signature provided in webhook')
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 401 }
      )
    }

    const isValid = verifyWebhookSignature(signature, body)
    
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    console.log('Webhook event:', event.event, 'Reference:', event.data?.reference)

    // Handle successful payment charge
    if (event.event === 'charge.success') {
      // Use service role client to bypass RLS (webhooks have no user session)
      const supabase = createServiceRoleClient()
      const reference = event.data.reference
      const amount = event.data.amount / 100 // Convert kobo to KES
      
      console.log('Processing successful charge:', reference, 'Amount:', amount)
      
      // Find payment record by Paystack reference
      const { data: payment, error: paymentFetchError } = await supabase
        .from('payments')
        .select('*, invoices(*)')
        .eq('paystack_reference', reference)
        .single()

      if (paymentFetchError || !payment) {
        console.error('Payment not found for reference:', reference)
        // Still return 200 to Paystack to avoid retries
        return NextResponse.json({ received: true })
      }

      console.log('Payment found:', payment.id, 'Invoice:', payment.invoice_id)

      // Verify amount matches (security check)
      if (Math.abs(payment.amount - amount) > 1) { // Allow 1 KES difference for rounding
        console.error('Amount mismatch! Expected:', payment.amount, 'Got:', amount)
        return NextResponse.json({ 
          received: true,
          warning: 'Amount mismatch detected'
        })
      }

      // Check if already processed (idempotency)
      if (payment.status === 'completed') {
        console.log('Payment already processed, skipping')
        return NextResponse.json({ received: true, message: 'Already processed' })
      }

      // Update payment status
      console.log('Updating payment status to completed...')
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          paystack_authorization_code: event.data.authorization?.authorization_code,
          payment_channel: event.data.channel,
          callback_data: {
            ...payment.callback_data,
            webhook_data: event.data,
            processed_at: new Date().toISOString(),
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
          paid_at: new Date().toISOString(),
          transaction_reference: reference,
        })
        .eq('id', payment.invoice_id)

      if (invoiceUpdateError) {
        console.error('Error updating invoice:', invoiceUpdateError)
        throw invoiceUpdateError
      }

      // Generate receipt record (using helper function)
      console.log('Generating receipt record...')
      const { data: receiptNumberData } = await supabase
        .rpc('generate_receipt_number')
        .single()
      
      const receiptNumber = receiptNumberData || `REC-${Date.now()}-${payment.invoice_id.substring(0, 8)}`

      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          invoice_id: payment.invoice_id,
          payment_id: payment.id,
          receipt_number: receiptNumber,
          receipt_data: {
            invoice_id: payment.invoice_id,
            payment_reference: reference,
            amount: amount,
            currency: event.data.currency,
            payment_channel: event.data.channel,
            paid_at: event.data.paid_at || new Date().toISOString(),
            customer: {
              email: event.data.customer?.email,
              name: payment.callback_data?.parentData?.full_name,
            },
          },
        })
        .select()
        .single()

      if (receiptError) {
        console.error('Error creating receipt:', receiptError)
        // Don't fail the webhook if receipt creation fails
      } else {
        console.log('Receipt created:', receipt.receipt_number)
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

      // Send receipt email to parent
      const parentEmail = metadata?.parentEmail || event.data.customer?.email
      const parentName = metadata?.parentData?.full_name || event.data.customer?.email
      
      if (parentEmail && receipt) {
        console.log('Sending receipt email to:', parentEmail)
        // Import dynamically to avoid circular dependencies
        const { sendReceiptEmail } = await import('@/lib/utils/send-email')
        
        await sendReceiptEmail({
          to: parentEmail,
          receiptNumber: receipt.receipt_number,
          invoiceId: payment.invoice_id,
          amount: amount,
          parentName: parentName,
        })
      }

      console.log('Payment processing completed successfully')
      return NextResponse.json({ 
        received: true,
        processed: true,
        receipt_number: receipt?.receipt_number,
      })
    }

    // Handle failed payment
    if (event.event === 'charge.failed') {
      // Use service role client to bypass RLS (webhooks have no user session)
      const supabase = createServiceRoleClient()
      const reference = event.data.reference
      
      console.log('Processing failed charge:', reference)
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          callback_data: {
            webhook_data: event.data,
            failure_message: event.data.gateway_response,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('paystack_reference', reference)

      console.log('Payment marked as failed')
      return NextResponse.json({ received: true })
    }

    // Log other events but don't process
    console.log('Unhandled webhook event:', event.event)
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Always return 200 to Paystack to avoid retries
    // But log the error for investigation
    return NextResponse.json(
      { 
        received: true,
        error: 'Processing failed',
        message: error.message 
      },
      { status: 200 } // Return 200 to prevent Paystack retries
    )
  }
}
