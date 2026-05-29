/**
 * Client-side hCaptcha visibility (NEXT_PUBLIC_* only).
 */

export function isHcaptchaRequiredOnClient() {
  return process.env.NEXT_PUBLIC_HCAPTCHA_ENABLED === '1'
}

export function getClientHcaptchaSiteKey() {
  const key = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : null
}
