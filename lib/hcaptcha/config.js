/**
 * hCaptcha configuration (server and public client flags).
 */

export function isHcaptchaEnabled() {
  return process.env.HCAPTCHA_ENABLED === '1'
}

/** Skip verification in development when captcha is not explicitly enabled. */
export function shouldSkipHcaptchaVerification() {
  if (isHcaptchaEnabled()) return false
  return process.env.NODE_ENV !== 'production'
}

export function getHcaptchaSiteKey() {
  const key = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export function getHcaptchaSecret() {
  const secret = process.env.HCAPTCHA_SECRET
  return typeof secret === 'string' && secret.trim() ? secret.trim() : null
}
