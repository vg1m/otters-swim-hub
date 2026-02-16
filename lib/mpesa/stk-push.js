import axios from 'axios'
import { getMpesaToken } from './auth'

// M-Pesa STK Push URL
const getStkPushUrl = (environment) => {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
}

// Generate timestamp in the format YYYYMMDDHHmmss
function getTimestamp() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hour}${minute}${second}`
}

// Generate password for M-Pesa STK Push
function generatePassword(shortcode, passkey, timestamp) {
  const data = `${shortcode}${passkey}${timestamp}`
  return Buffer.from(data).toString('base64')
}

// Initiate STK Push
export async function initiateStkPush({ phoneNumber, amount, accountReference, transactionDesc }) {
  const environment = process.env.MPESA_ENVIRONMENT || 'sandbox'
  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY
  const callbackUrl = process.env.MPESA_CALLBACK_URL

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error('M-Pesa configuration incomplete')
  }

  // Format phone number (remove + if present, ensure 254 prefix)
  let formattedPhone = phoneNumber.replace(/\+/g, '')
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1)
  }
  if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone
  }

  const timestamp = getTimestamp()
  const password = generatePassword(shortcode, passkey, timestamp)
  const token = await getMpesaToken()

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.floor(amount), // Must be integer
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference || 'Otters Kenya',
    TransactionDesc: transactionDesc || 'Swimmer Registration',
  }

  try {
    const response = await axios.post(getStkPushUrl(environment), payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    return {
      success: true,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      customerMessage: response.data.CustomerMessage,
    }
  } catch (error) {
    console.error('M-Pesa STK Push error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.errorMessage || 'Failed to initiate payment')
  }
}
