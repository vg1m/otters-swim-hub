import axios from 'axios'

// M-Pesa OAuth URL
const getAuthUrl = (environment) => {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
}

// Generate M-Pesa OAuth token
export async function getMpesaToken() {
  const environment = process.env.MPESA_ENVIRONMENT || 'sandbox'
  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa credentials not configured')
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  try {
    const response = await axios.get(getAuthUrl(environment), {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    return response.data.access_token
  } catch (error) {
    console.error('M-Pesa auth error:', error.response?.data || error.message)
    throw new Error('Failed to get M-Pesa token')
  }
}
