import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCallback, extractPaymentDetails } from '@/lib/mpesa/validation'

export async function POST(request) {
  try {
    const callbackData = await request.json()
    console.log('M-Pesa Callback received:', JSON.stringify(callbackData, null, 2))

    // Validate callback structure
    const validation = validateCallback(callbackData)
    
    if (!validation.valid) {
      console.error('Invalid callback:', validation.error)
      return NextResponse.json({ ResultCode: 1, ResultDesc: validation.error })
    }

    const supabase = await createClient()

    // Find payment record by checkout request ID
    const { data: payments } = await supabase
      .from('payments')
      .select('*, invoices(*)')
      .eq('callback_data->>checkoutRequestId', validation.checkoutRequestId)
      .single()

    if (!payments) {
      console.error('Payment not found for checkout request:', validation.checkoutRequestId)
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment not found' })
    }

    if (validation.success) {
      // Payment successful
      const paymentDetails = extractPaymentDetails(callbackData)

      // Update payment record
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          mpesa_transaction_id: paymentDetails.mpesaReceiptNumber,
          callback_data: {
            ...payments.callback_data,
            ...paymentDetails,
            fullCallback: callbackData,
          },
        })
        .eq('id', payments.id)

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_reference: paymentDetails.mpesaReceiptNumber,
        })
        .eq('id', payments.invoice_id)

      // Update swimmers status to 'pending' (awaiting admin approval)
      if (payments.callback_data?.swimmers) {
        await supabase
          .from('swimmers')
          .update({ status: 'pending' })
          .in('id', payments.callback_data.swimmers)
      }

      // TODO: Send confirmation email to parent
      console.log('Payment successful:', paymentDetails)
      console.log('Email would be sent to:', payments.callback_data?.parentEmail)

      return NextResponse.json({ 
        ResultCode: 0, 
        ResultDesc: 'Payment processed successfully' 
      })
    } else {
      // Payment failed or cancelled
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          callback_data: {
            ...payments.callback_data,
            failureReason: validation.resultDesc,
            fullCallback: callbackData,
          },
        })
        .eq('id', payments.id)

      console.log('Payment failed:', validation.resultDesc)

      return NextResponse.json({ 
        ResultCode: 0, 
        ResultDesc: 'Callback received' 
      })
    }
  } catch (error) {
    console.error('Callback processing error:', error)
    return NextResponse.json({ 
      ResultCode: 1, 
      ResultDesc: 'Internal server error' 
    })
  }
}
