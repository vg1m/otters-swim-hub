import jsPDF from 'jspdf'
import { formatKES } from './currency'
import { format } from 'date-fns'
import { loadReceiptLogo } from '@/lib/receipt/load-receipt-logo'

const BRAND_NAME = 'Otters Kenya Swimming Academy'

function isMissingReceiptRef(ref) {
  const value = typeof ref === 'string' ? ref.trim() : ''
  return !value || /^n\/a$/i.test(value)
}

/** @returns {string | null} Human-readable method, or null if only generic gateway info */
function formatPaymentMethodLabel(channel) {
  const value = typeof channel === 'string' ? channel.trim() : ''
  if (!value || value.toLowerCase() === 'paystack') return null
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Generate a PDF receipt with Otters branding
 * @param {Object} receiptData - Receipt information
 * @param {{ dataUrl: string, format: string } | null} [logo]
 * @returns {jsPDF} PDF document
 */
export function generateReceipt(receiptData, logo = null) {
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

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const headerHeight = 40

  const primaryColor = [0, 132, 213]
  const darkGray = [41, 37, 36]
  const lightGray = [156, 163, 175]
  const backgroundColor = [245, 247, 250]

  doc.setFillColor(...backgroundColor)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  const logoW = 36
  const logoH = 14

  if (logo?.dataUrl) {
    try {
      doc.addImage(logo.dataUrl, logo.format || 'PNG', margin, 12, logoW, logoH)
    } catch {
      // Logo optional; header stays text-only
    }
  }

  doc.setFontSize(11)
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'bold')
  const receiptTitle = 'OFFICIAL RECEIPT'
  const titleWidth = doc.getTextWidth(receiptTitle)
  doc.text(receiptTitle, pageWidth - margin - titleWidth, 18)

  let yPos = 55

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

  doc.setFont('helvetica', 'bold')
  doc.text('Invoice ID:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(`INV-${invoice_id.substring(0, 8).toUpperCase()}`, margin + 45, yPos)

  if (!isMissingReceiptRef(payment_reference)) {
    yPos += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Transaction Ref:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(payment_reference.trim(), margin + 45, yPos)
    doc.setFontSize(10)
  }

  yPos += 15

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

  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)

  yPos += 8

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkGray)
  doc.text('Description', margin, yPos)
  doc.text('Amount', pageWidth - margin - 30, yPos, { align: 'right' })

  yPos += 7
  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)

  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)

  if (line_items && line_items.length > 0) {
    line_items.forEach((item) => {
      doc.text(item.description, margin, yPos)
      doc.text(formatKES(item.amount), pageWidth - margin - 30, yPos, { align: 'right' })
      yPos += 7
    })
  } else if (swimmers && swimmers.length > 0) {
    swimmers.forEach((swimmer) => {
      doc.text(`Registration: ${swimmer.name}`, margin, yPos)
      doc.text(formatKES(3000), pageWidth - margin - 30, yPos, { align: 'right' })
      yPos += 7
    })
  }

  yPos += 3
  doc.setDrawColor(...lightGray)
  doc.line(margin, yPos, pageWidth - margin, yPos)

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

  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkGray)
  doc.text('PAYMENT DETAILS', margin, yPos)

  yPos += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const paymentMethodLabel = formatPaymentMethodLabel(payment_channel)
  if (paymentMethodLabel) {
    doc.text('Payment Method:', margin, yPos)
    doc.text(paymentMethodLabel, margin + 40, yPos)
    yPos += 6
  }

  doc.text('Payment Date:', margin, yPos)
  doc.text(format(new Date(paid_at), 'dd MMM yyyy, HH:mm'), margin + 40, yPos)

  yPos += 6
  doc.text('Status:', margin, yPos)
  doc.setTextColor(34, 197, 94)
  doc.setFont('helvetica', 'bold')
  doc.text('PAID', margin + 40, yPos)

  yPos += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...darkGray)
  const thankYouMsg = 'Thank you for your payment!'
  const thankYouWidth = doc.getTextWidth(thankYouMsg)
  doc.text(thankYouMsg, (pageWidth - thankYouWidth) / 2, yPos)

  if (swimmers && swimmers.length > 0) {
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...lightGray)
    doc.text('REGISTERED SWIMMERS', margin, yPos)

    yPos += 6
    doc.setFont('helvetica', 'normal')
    swimmers.forEach((swimmer, index) => {
      const squadLabel = swimmer.squad
        ? String(swimmer.squad).replace(/_/g, ' ').toUpperCase()
        : ''
      doc.text(
        `${index + 1}. ${swimmer.name}${squadLabel ? ` - ${squadLabel} Squad` : ''}`,
        margin,
        yPos
      )
      yPos += 5
    })
  }

  const footerY = pageHeight - 25

  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.setFont('helvetica', 'normal')

  doc.text(BRAND_NAME, pageWidth / 2, footerY + 6, { align: 'center' })
  doc.text('www.otters.ke', pageWidth / 2, footerY + 10, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.text('Payments secured by Paystack™', pageWidth / 2, footerY + 14, { align: 'center' })

  return doc
}

/**
 * @param {Object} receiptData
 * @returns {Promise<Buffer>}
 */
export async function generateReceiptBuffer(receiptData) {
  const logo = await loadReceiptLogo()
  const doc = generateReceipt(receiptData, logo)
  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * @param {Object} receiptData
 * @returns {Promise<string>}
 */
export async function generateReceiptBase64(receiptData) {
  const logo = await loadReceiptLogo()
  const doc = generateReceipt(receiptData, logo)
  return doc.output('dataurlstring')
}

/**
 * @param {Object} receiptData
 * @param {string} [filename]
 */
export async function downloadReceipt(receiptData, filename = 'receipt.pdf') {
  const logo = await loadReceiptLogo()
  const doc = generateReceipt(receiptData, logo)
  doc.save(filename)
}
