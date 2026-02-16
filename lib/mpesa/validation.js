// Validate M-Pesa callback data
export function validateCallback(callbackData) {
  if (!callbackData || !callbackData.Body) {
    return { valid: false, error: 'Invalid callback structure' }
  }

  const { stkCallback } = callbackData.Body

  if (!stkCallback) {
    return { valid: false, error: 'Missing STK callback data' }
  }

  const { ResultCode, ResultDesc, CheckoutRequestID } = stkCallback

  return {
    valid: true,
    resultCode: ResultCode,
    resultDesc: ResultDesc,
    checkoutRequestId: CheckoutRequestID,
    success: ResultCode === 0,
  }
}

// Extract payment details from callback
export function extractPaymentDetails(callbackData) {
  const { stkCallback } = callbackData.Body

  if (stkCallback.ResultCode !== 0) {
    return null // Payment failed or was cancelled
  }

  const callbackMetadata = stkCallback.CallbackMetadata?.Item || []
  
  const details = {}
  callbackMetadata.forEach(item => {
    if (item.Name === 'Amount') {
      details.amount = item.Value
    } else if (item.Name === 'MpesaReceiptNumber') {
      details.mpesaReceiptNumber = item.Value
    } else if (item.Name === 'TransactionDate') {
      details.transactionDate = item.Value
    } else if (item.Name === 'PhoneNumber') {
      details.phoneNumber = item.Value
    }
  })

  return details
}
