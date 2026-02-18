import jsPDF from 'jspdf'
import { formatKES } from './currency'
import { format } from 'date-fns'

/**
 * Generate a modern PDF receipt with Otters Kenya branding
 * @param {Object} receiptData - Receipt information
 * @returns {jsPDF} PDF document
 */
export function generateReceipt(receiptData) {
  const {
    receipt_number,
    invoice_id,
    payment_reference,
    amount,
    paid_at,
    payment_channel,
    parent_name,
    parent_email,
    parent_phone,
    swimmers,
    line_items,
  } = receiptData

  // Create PDF (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // Colors (Otters Kenya - swimming pool blue)
  const primaryColor = [0, 132, 213] // #0084d5
  const darkGray = [41, 37, 36] // #292524
  const lightGray = [156, 163, 175] // #9CA3AF
  const backgroundColor = [245, 247, 250] // #F5F7FA

  // Add subtle background
  doc.setFillColor(...backgroundColor)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Header section with primary color bar
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Logo placeholder (you can replace with actual logo image if needed)
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('OTTERS', margin, 18)
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Kenya Swim Club', margin, 26)

  // Receipt title
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  const receiptTitle = 'OFFICIAL RECEIPT'
  const titleWidth = doc.getTextWidth(receiptTitle)
  doc.text(receiptTitle, pageWidth - margin - titleWidth, 22)

  // Receipt details box
  let yPos = 55

  // Receipt number and date
  doc.setFontSize(10)
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Receipt Number:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(receipt_number, margin + 45, yPos)

  doc.setFont('helvetica', 'bold')
  const dateLabel = 'Date:'
  const dateLabelWidth = doc.getTextWidth(dateLabel)
  doc.text(dateLabel, pageWidth - margin - 60, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(paid_at), 'dd MMM yyyy'), pageWidth - margin - 60 + dateLabelWidth + 2, yPos)

  yPos += 7

  // Invoice reference
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice ID:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(`INV-${invoice_id.substring(0, 8).toUpperCase()}`, margin + 45, yPos)

  yPos += 7

  // Payment reference
  doc.setFont('helvetica', 'bold')
  doc.text('Transaction Ref:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(payment_reference, margin + 45, yPos)
  doc.setFontSize(10)

  yPos += 15

  // Bill To section
  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BILL TO', margin, yPos)
  
  yPos += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(parent_name, margin, yPos)
  
  yPos += 6
  doc.setTextColor(...lightGray)
  doc.text(parent_email, margin, yPos)
  
  yPos += 6
  doc.text(parent_phone, margin, yPos)
  
  yPos += 12

  // Line items table
  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  yPos += 8
  
  // Table headers
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkGray)
  doc.text('Description', margin, yPos)
  doc.text('Amount', pageWidth - margin - 30, yPos, { align: 'right' })
  
  yPos += 7
  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  
  yPos += 8

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)
  
  if (line_items && line_items.length > 0) {
    line_items.forEach((item) => {
      doc.text(item.description, margin, yPos)
      doc.text(formatKES(item.amount), pageWidth - margin - 30, yPos, { align: 'right' })
      yPos += 7
    })
  } else if (swimmers && swimmers.length > 0) {
    // Fallback: generate from swimmers
    swimmers.forEach((swimmer) => {
      doc.text(`Registration: ${swimmer.name}`, margin, yPos)
      doc.text(formatKES(3500), pageWidth - margin - 30, yPos, { align: 'right' })
      yPos += 7
    })
  }

  yPos += 3
  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)

  // Total section
  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL PAID', margin, yPos)
  doc.setTextColor(...primaryColor)
  doc.text(formatKES(amount), pageWidth - margin - 30, yPos, { align: 'right' })

  yPos += 10
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(1)
  doc.line(margin, yPos, pageWidth - margin, yPos)

  // Payment details
  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkGray)
  doc.text('PAYMENT DETAILS', margin, yPos)

  yPos += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  
  doc.text('Payment Method:', margin, yPos)
  doc.text(payment_channel?.toUpperCase() || 'PAYSTACK', margin + 40, yPos)

  yPos += 6
  doc.text('Payment Date:', margin, yPos)
  doc.text(format(new Date(paid_at), 'dd MMM yyyy, HH:mm'), margin + 40, yPos)

  yPos += 6
  doc.text('Status:', margin, yPos)
  doc.setTextColor(34, 197, 94) // Green for paid
  doc.setFont('helvetica', 'bold')
  doc.text('PAID', margin + 40, yPos)

  // Thank you message
  yPos += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...darkGray)
  const thankYouMsg = 'Thank you for your payment!'
  const thankYouWidth = doc.getTextWidth(thankYouMsg)
  doc.text(thankYouMsg, (pageWidth - thankYouWidth) / 2, yPos)

  // Swimmers registered section (if applicable)
  if (swimmers && swimmers.length > 0) {
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...lightGray)
    doc.text('REGISTERED SWIMMERS', margin, yPos)
    
    yPos += 6
    doc.setFont('helvetica', 'normal')
    swimmers.forEach((swimmer, index) => {
      doc.text(`${index + 1}. ${swimmer.name} - ${swimmer.squad?.replace('_', ' ').toUpperCase()} Squad`, margin, yPos)
      yPos += 5
    })
  }

  // Footer
  const footerY = pageHeight - 25
  
  // Footer line
  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  // Footer text
  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.setFont('helvetica', 'normal')
  
  const footerText1 = 'Otters Kenya Swim Club'
  const footerText2 = 'Email: victor@mwago.me'
  const footerText3 = 'Payments secured by PayStack'
  
  doc.text(footerText1, pageWidth / 2, footerY + 6, { align: 'center' })
  doc.text(footerText2, pageWidth / 2, footerY + 10, { align: 'center' })
  
  // PayStack branding
  doc.setFont('helvetica', 'bold')
  doc.text(footerText3, pageWidth / 2, footerY + 14, { align: 'center' })

  return doc
}

/**
 * Generate and return receipt as buffer
 * @param {Object} receiptData - Receipt information
 * @returns {Buffer} PDF buffer
 */
export function generateReceiptBuffer(receiptData) {
  const doc = generateReceipt(receiptData)
  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Generate and return receipt as base64 string
 * @param {Object} receiptData - Receipt information
 * @returns {string} Base64 encoded PDF
 */
export function generateReceiptBase64(receiptData) {
  const doc = generateReceipt(receiptData)
  return doc.output('dataurlstring')
}

/**
 * Generate receipt and trigger browser download
 * @param {Object} receiptData - Receipt information
 * @param {string} filename - Download filename
 */
export function downloadReceipt(receiptData, filename = 'receipt.pdf') {
  const doc = generateReceipt(receiptData)
  doc.save(filename)
}
