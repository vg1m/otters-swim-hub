import { jsPDF } from 'jspdf'
import { formatKES } from './currency'
import { formatDate, formatDateTime } from './date-helpers'

export async function generateReceipt(invoice, payment, profile) {
  const doc = new jsPDF()
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  
  // Header - Club Logo/Name
  doc.setFontSize(24)
  doc.setTextColor(0, 102, 204) // Primary blue
  doc.text('Otters Kenya Swim Club', pageWidth / 2, 30, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Payment Receipt', pageWidth / 2, 38, { align: 'center' })
  
  // Line separator
  doc.setLineWidth(0.5)
  doc.setDrawColor(0, 102, 204)
  doc.line(margin, 45, pageWidth - margin, 45)
  
  // Receipt Information
  let yPos = 60
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont(undefined, 'bold')
  doc.text('RECEIPT', margin, yPos)
  
  yPos += 10
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Receipt No:`, margin, yPos)
  doc.text(`${invoice.id.substring(0, 8).toUpperCase()}`, 70, yPos)
  
  yPos += 7
  doc.text(`Date:`, margin, yPos)
  doc.text(formatDateTime(payment.created_at), 70, yPos)
  
  yPos += 7
  doc.text(`Payment Method:`, margin, yPos)
  doc.text('Online Payment', 70, yPos)
  
  // Customer Information
  yPos += 15
  doc.setFont(undefined, 'bold')
  doc.text('BILLED TO:', margin, yPos)
  
  yPos += 7
  doc.setFont(undefined, 'normal')
  doc.text(profile.full_name, margin, yPos)
  
  yPos += 7
  doc.text(profile.phone_number, margin, yPos)
  
  yPos += 7
  if (invoice.swimmers) {
    doc.text(`Swimmer: ${invoice.swimmers.first_name} ${invoice.swimmers.last_name}`, margin, yPos)
  }
  
  // Line separator
  yPos += 10
  doc.setLineWidth(0.5)
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  // Line Items Header
  yPos += 10
  doc.setFont(undefined, 'bold')
  doc.text('Description', margin, yPos)
  doc.text('Amount', pageWidth - margin - 50, yPos)
  doc.text('Qty', pageWidth - margin - 30, yPos)
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' })
  
  yPos += 3
  doc.setLineWidth(0.3)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  // Line Items
  yPos += 7
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  
  if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
    invoice.invoice_line_items.forEach((item) => {
      if (yPos > pageHeight - 50) {
        doc.addPage()
        yPos = 30
      }
      
      // Description (with wrapping if needed)
      const splitDescription = doc.splitTextToSize(item.description, 80)
      doc.text(splitDescription, margin, yPos)
      
      // Amount
      doc.text(formatKES(item.amount), pageWidth - margin - 50, yPos)
      
      // Quantity
      doc.text(String(item.quantity), pageWidth - margin - 30, yPos)
      
      // Total
      doc.text(formatKES(item.amount * item.quantity), pageWidth - margin, yPos, { align: 'right' })
      
      yPos += (splitDescription.length * 5) + 5
    })
  }
  
  // Subtotal line
  yPos += 5
  doc.setLineWidth(0.3)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  // Total
  yPos += 10
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('TOTAL PAID:', pageWidth - margin - 60, yPos)
  doc.setTextColor(0, 168, 107) // Secondary green
  doc.text(formatKES(invoice.total_amount), pageWidth - margin, yPos, { align: 'right' })
  
  // Payment Status
  yPos += 15
  doc.setFontSize(10)
  doc.setTextColor(0, 168, 107)
  doc.setFont(undefined, 'bold')
  const statusText = '✓ PAID IN FULL'
  doc.text(statusText, pageWidth / 2, yPos, { align: 'center' })
  
  // Footer
  yPos = pageHeight - 40
  doc.setLineWidth(0.5)
  doc.setDrawColor(0, 102, 204)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  yPos += 10
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.setFont(undefined, 'normal')
  doc.text('Thank you for your payment!', pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 6
  doc.setFontSize(8)
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 5
  doc.text('For any queries, please contact the club administrator.', pageWidth / 2, yPos, { align: 'center' })
  
  return doc
}

export async function downloadReceipt(invoice, payment, profile) {
  const doc = await generateReceipt(invoice, payment, profile)
  const filename = `receipt-${invoice.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

export async function getReceiptBlob(invoice, payment, profile) {
  const doc = await generateReceipt(invoice, payment, profile)
  return doc.output('blob')
}

export async function getReceiptDataUrl(invoice, payment, profile) {
  const doc = await generateReceipt(invoice, payment, profile)
  return doc.output('dataurlstring')
}
