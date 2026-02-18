const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_API_BASE = 'https://api.paystack.co'

if (!PAYSTACK_SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY environment variable is not set')
} else {
  console.log('✅ PAYSTACK_SECRET_KEY loaded')
  console.log('Key starts with:', PAYSTACK_SECRET_KEY.substring(0, 7))
  console.log('Key length:', PAYSTACK_SECRET_KEY.length)
}

/**
 * Make a request to Paystack API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body
 * @returns {Promise<Object>} API response
 */
async function paystackRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  console.log('🔵 Paystack Request:', method, `${PAYSTACK_API_BASE}${endpoint}`)
  console.log('🔵 Request data:', data ? JSON.stringify(data, null, 2) : 'No data')

  const response = await fetch(`${PAYSTACK_API_BASE}${endpoint}`, options)
  const result = await response.json()

  console.log('🔵 Paystack Response Status:', response.status, response.statusText)
  console.log('🔵 Paystack Response:', JSON.stringify(result, null, 2))

  if (!response.ok) {
    console.error('❌ Paystack API Error:', result)
    throw new Error(result.message || 'Paystack API request failed')
  }

  return result
}

/**
 * Initialize a Paystack payment transaction
 * @param {Object} params - Transaction parameters
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in KES (will be converted to kobo/cents)
 * @param {string} params.reference - Unique transaction reference
 * @param {Object} params.metadata - Additional transaction metadata
 * @param {string} params.callback_url - URL to redirect after payment
 * @returns {Promise<Object>} Authorization URL and access code
 */
export async function initializePaystackTransaction({
  email,
  amount, // In KES
  reference,
  metadata = {},
  callback_url,
}) {
  try {
    console.log('💰 Initializing Paystack transaction...')
    console.log('Email:', email)
    console.log('Amount (KES):', amount)
    console.log('Reference:', reference)
    
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured')
    }

    const requestBody = {
      email,
      amount: Math.round(amount * 100), // Convert KES to kobo (cents)
      reference,
      currency: 'KES', // Kenyan Shillings
      metadata: {
        ...metadata,
        custom_fields: [
          {
            display_name: 'Payment For',
            variable_name: 'payment_for',
            value: metadata.payment_description || 'Swimmer Registration',
          },
        ],
      },
      callback_url,
      channels: ['card', 'mobile_money', 'bank_transfer'], // Enable all payment methods
    }

    const response = await paystackRequest('/transaction/initialize', 'POST', requestBody)

    return {
      success: true,
      authorization_url: response.data.authorization_url,
      access_code: response.data.access_code,
      reference: response.data.reference,
    }
  } catch (error) {
    console.error('Paystack initialization error:', error)
    throw new Error(error.message || 'Failed to initialize payment')
  }
}

/**
 * Verify a Paystack payment transaction
 * @param {string} reference - Transaction reference to verify
 * @returns {Promise<Object>} Verification result with transaction data
 */
export async function verifyPaystackTransaction(reference) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured')
    }

    console.log('[Paystack] Verifying transaction:', reference)
    const response = await paystackRequest(`/transaction/verify/${reference}`, 'GET')
    
    console.log('[Paystack] Response status:', response.status)
    console.log('[Paystack] Transaction status:', response.data?.status)
    
    if (!response.data) {
      console.error('[Paystack] No data in response:', response)
      throw new Error('Invalid response from Paystack')
    }
    
    const isSuccessful = response.data.status === 'success'
    
    return {
      success: isSuccessful,
      status: response.data.status,
      amount: response.data.amount / 100, // Convert kobo back to KES
      currency: response.data.currency,
      paid_at: response.data.paid_at,
      channel: response.data.channel,
      authorization_code: response.data.authorization?.authorization_code,
      customer_email: response.data.customer?.email,
      metadata: response.data.metadata,
      reference: response.data.reference,
      raw_data: response.data,
      gateway_response: response.data.gateway_response,
    }
  } catch (error) {
    console.error('[Paystack] Verification error:', error)
    console.error('[Paystack] Error details:', error.message)
    throw new Error(error.message || 'Failed to verify payment')
  }
}

/**
 * Get transaction details
 * @param {string} reference - Transaction reference
 * @returns {Promise<Object>} Transaction details
 */
export async function getTransactionDetails(reference) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured')
    }

    const response = await paystackRequest(`/transaction/${reference}`, 'GET')
    
    return {
      success: true,
      transaction: response.data,
    }
  } catch (error) {
    console.error('Error fetching transaction:', error)
    throw new Error(error.message || 'Failed to fetch transaction details')
  }
}

/**
 * Verify webhook signature from Paystack
 * @param {string} signature - x-paystack-signature header value
 * @param {string} body - Raw request body
 * @returns {boolean} True if signature is valid
 */
export function verifyWebhookSignature(signature, body) {
  const crypto = require('crypto')
  const secret = process.env.PAYSTACK_SECRET_KEY
  
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY not configured')
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')

  return hash === signature
}

/**
 * Helper: Generate unique payment reference
 * @param {string} prefix - Reference prefix (e.g., 'REG', 'INV')
 * @param {string} id - Record ID
 * @returns {string} Unique reference
 */
export function generatePaymentReference(prefix, id) {
  const timestamp = Date.now()
  const shortId = id.substring(0, 8)
  return `${prefix}-${shortId}-${timestamp}`
}
