import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReceiptBuffer } from '@/lib/utils/generate-receipt'

/**
 * Generate and download receipt PDF for an invoice
 */
export async function GET(request, { params }) {
  try {
    // Await params (Next.js 15+ requirement)
    const { invoiceId } = await params

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get receipt and related data
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        *,
        invoices (
          *,
          profiles (full_name, email, phone_number),
          invoice_line_items (*)
        ),
        payments (
          paystack_reference,
          payment_channel,
          paid_at
        )
      `)
      .eq('invoice_id', invoiceId)
      .single()

    if (receiptError || !receipt) {
      console.error('Receipt not found:', receiptError)
      return NextResponse.json(
        { error: 'Receipt not found for this invoice' },
        { status: 404 }
      )
    }

    // Verify user owns this invoice (or is admin)
    const invoice = receipt.invoices
    const profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile.data?.role === 'admin'
    const isOwner = invoice.parent_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to access this receipt' },
        { status: 403 }
      )
    }

    // Get swimmers for this invoice
    const { data: swimmers } = await supabase
      .from('swimmers')
      .select('id, first_name, last_name, squad')
      .eq('parent_id', invoice.parent_id)

    // Prepare receipt data
    const receiptData = {
      receipt_number: receipt.receipt_number,
      invoice_id: invoiceId,
      payment_reference: receipt.payments?.paystack_reference || 'N/A',
      amount: invoice.total_amount,
      paid_at: receipt.payments?.paid_at || receipt.issued_at,
      payment_channel: receipt.payments?.payment_channel || 'paystack',
      parent_name: invoice.profiles?.full_name || 'N/A',
      parent_email: invoice.profiles?.email || 'N/A',
      parent_phone: invoice.profiles?.phone_number || 'N/A',
      swimmers: swimmers?.map(s => ({
        name: `${s.first_name} ${s.last_name}`,
        squad: s.squad,
      })) || [],
      line_items: invoice.invoice_line_items || [],
    }

    // Generate PDF
    const pdfBuffer = generateReceiptBuffer(receiptData)

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receipt.receipt_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Receipt download error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate receipt',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
