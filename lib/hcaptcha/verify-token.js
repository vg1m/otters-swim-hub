import {
  getHcaptchaSecret,
  getHcaptchaSiteKey,
  isHcaptchaEnabled,
  shouldSkipHcaptchaVerification,
} from '@/lib/hcaptcha/config'

const VERIFY_URL = 'https://api.hcaptcha.com/siteverify'
export const HCAPTCHA_FAILED_MESSAGE =
  'Verification failed. Please complete the security check and try again.'

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp?.trim()) return realIp.trim()
  return null
}

/**
 * @param {string} token
 * @param {{ remoteip?: string | null }} [opts]
 * @returns {Promise<{ ok: boolean, errorCodes?: string[] }>}
 */
export async function verifyHcaptchaToken(token, opts = {}) {
  const secret = getHcaptchaSecret()
  const sitekey = getHcaptchaSiteKey()

  if (!secret) {
    console.error('hcaptcha: HCAPTCHA_SECRET is not configured')
    return { ok: false, errorCodes: ['missing-secret'] }
  }

  const params = new URLSearchParams()
  params.set('secret', secret)
  params.set('response', token)
  if (sitekey) params.set('sitekey', sitekey)
  if (opts.remoteip) params.set('remoteip', opts.remoteip)

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json()
    return {
      ok: data?.success === true,
      errorCodes: Array.isArray(data?.['error-codes']) ? data['error-codes'] : undefined,
    }
  } catch (err) {
    console.error('hcaptcha: siteverify request failed', err)
    return { ok: false, errorCodes: ['network-error'] }
  }
}

/**
 * Enforce hCaptcha on API routes. Returns null when OK, or a JSON-ready error object.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ hcaptchaToken?: unknown }} body
 * @returns {Promise<{ status: number, error: string } | null>}
 */
export async function assertHcaptcha(request, body) {
  if (shouldSkipHcaptchaVerification()) {
    return null
  }

  if (!isHcaptchaEnabled()) {
    console.error('hcaptcha: HCAPTCHA_ENABLED must be 1 in production')
    return { status: 503, error: 'Security verification is not configured.' }
  }

  const token =
    typeof body?.hcaptchaToken === 'string' ? body.hcaptchaToken.trim() : ''

  if (!token) {
    return { status: 400, error: HCAPTCHA_FAILED_MESSAGE }
  }

  const result = await verifyHcaptchaToken(token, {
    remoteip: getClientIp(request),
  })

  if (!result.ok) {
    if (result.errorCodes?.length) {
      console.warn('hcaptcha: verification failed', result.errorCodes)
    }
    return { status: 400, error: HCAPTCHA_FAILED_MESSAGE }
  }

  return null
}
