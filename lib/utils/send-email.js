/**
 * Send receipt email notification via Supabase (placeholder)
 * Note: This uses Supabase's basic email functionality
 * TODO: Replace with SMTP2GO when ready for production
 * 
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.receiptNumber - Receipt number
 * @param {string} params.invoiceId - Invoice ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.parentName - Parent name
 */
export async function sendReceiptEmail({
  to,
  receiptNumber,
  invoiceId,
  amount,
  parentName,
}) {
  try {
    console.log('Sending receipt email to:', to)
    
    // Note: Supabase doesn't have a direct email API for custom emails
    // This is a placeholder for future SMTP2GO integration
    
    // For now, we'll log the email details
    // When integrating SMTP2GO, replace this with actual email sending
    
    const emailData = {
      to,
      subject: `Receipt ${receiptNumber} - Otters Kenya Academy of Swimming Limited`,
      text: `Dear ${parentName},

Thank you for your payment!

Your payment has been successfully processed.

Receipt Number: ${receiptNumber}
Invoice ID: INV-${invoiceId.substring(0, 8).toUpperCase()}
Amount Paid: KES ${amount.toLocaleString()}

You can download your receipt from your dashboard at any time.

Login to your account: ${process.env.NEXT_PUBLIC_APP_URL}/login

If you have any questions, please contact us at victor@mwago.me

Best regards,
Otters Kenya Academy of Swimming Limited

---
Payments secured by Paystack™
`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0084d5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f5f7fa; padding: 30px; }
              .receipt-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .receipt-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .receipt-item strong { color: #0084d5; }
              .button { display: inline-block; background-color: #0084d5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Otters Kenya Academy of Swimming Limited</h1>
                <p>Payment Receipt</p>
              </div>
              
              <div class="content">
                <h2>Dear ${parentName},</h2>
                <p>Thank you for your payment! Your transaction has been successfully processed.</p>
                
                <div class="receipt-box">
                  <div class="receipt-item">
                    <span>Receipt Number:</span>
                    <strong>${receiptNumber}</strong>
                  </div>
                  <div class="receipt-item">
                    <span>Invoice ID:</span>
                    <strong>INV-${invoiceId.substring(0, 8).toUpperCase()}</strong>
                  </div>
                  <div class="receipt-item">
                    <span>Amount Paid:</span>
                    <strong>KES ${amount.toLocaleString()}</strong>
                  </div>
                </div>
                
                <p>You can download your official receipt from your parent dashboard at any time.</p>
                
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">
                  Login to Dashboard
                </a>
                
                <p>If you have any questions, please contact us at <a href="mailto:victor@mwago.me">victor@mwago.me</a></p>
              </div>
              
              <div class="footer">
                <p>Otters Kenya Academy of Swimming Limited</p>
                <p><strong>Payments secured by Paystack™</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    console.log('Email data prepared:', { to, receiptNumber })
    console.log('⚠️ PLACEHOLDER: Actual email sending will be implemented with SMTP2GO')
    console.log('Email would contain:', emailData.subject)

    // TODO: When integrating SMTP2GO, add actual email sending here
    // Example:
    // const smtp2go = require('smtp2go-nodejs')
    // await smtp2go.send({
    //   api_key: process.env.SMTP2GO_API_KEY,
    //   to: [emailData.to],
    //   subject: emailData.subject,
    //   html_body: emailData.html,
    //   text_body: emailData.text,
    //   from: 'noreply@otterskenya.com',
    // })

    return {
      success: true,
      message: 'Email notification logged (SMTP2GO pending)',
      emailData, // Return for logging purposes
    }
  } catch (error) {
    console.error('Email notification error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Send invoice email notification
 * @param {Object} params - Email parameters
 */
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  parentName,
  swimmers,
}) {
  console.log('⚠️ PLACEHOLDER: Invoice email to', to)
  console.log('Invoice:', invoiceNumber, 'Amount:', amount)
  
  // TODO: Implement with SMTP2GO
  return {
    success: true,
    message: 'Invoice email logged (SMTP2GO pending)',
  }
}

/**
 * Coach session pay stub / notification (placeholder logging until SMTP2GO).
 * @param {Object} params
 * @param {string} params.coachEmail
 * @param {string} params.coachName
 * @param {number} params.amountKes
 * @param {string} params.sessionDate
 * @param {string} params.sessionEndLocal
 * @param {string} [params.notifyCc] - optional admin/finance copy
 */
export async function sendCoachSessionPayEmail({
  coachEmail,
  coachName,
  amountKes,
  sessionDate,
  sessionEndLocal,
  notifyCc,
}) {
  try {
    const subject = `Session pay recorded: ${sessionDate} (Otters Kenya Academy of Swimming Limited)`
    const text = `Hello ${coachName},

A training session you coached has ended. Pay for this session is recorded as:

Amount: KES ${Number(amountKes).toLocaleString()}
Session date: ${sessionDate}
Session end (local): ${sessionEndLocal}

This is an internal pay stub line for club records. Contact the club if anything looks wrong.

Otters Kenya Academy of Swimming Limited
`

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0084d5;">Session pay recorded</h2>
            <p>Hello ${coachName},</p>
            <p>A training session you coached has ended. Pay for this session is recorded as:</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>KES ${Number(amountKes).toLocaleString()}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Session date</strong></td><td>${sessionDate}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Session end (local)</strong></td><td>${sessionEndLocal}</td></tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">This is an internal pay stub line for club records.</p>
            <p>Otters Kenya Academy of Swimming Limited</p>
          </div>
        </body>
      </html>
    `

    console.log('Coach session pay email (placeholder):', {
      to: coachEmail,
      cc: notifyCc || null,
      subject,
    })
    console.log('⚠️ PLACEHOLDER: Wire SMTP2GO for production email delivery')

    return {
      success: true,
      message: 'Coach pay email logged (SMTP2GO pending)',
      emailData: { to: coachEmail, cc: notifyCc, subject, text, html },
    }
  } catch (error) {
    console.error('Coach session pay email error:', error)
    return { success: false, error: error.message }
  }
}
