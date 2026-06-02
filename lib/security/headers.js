/**
 * Security headers for Next.js (see docs/SECURITY_HEADERS.md).
 * Used by next.config.js headers().
 */

const PRIVACY_KE_ORIGINS = 'https://privacy.ke https://www.privacy.ke'

function buildContentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    [
      'script-src',
      "'self'",
      "'unsafe-inline'",
      'https://js.hcaptcha.com',
      'https://va.vercel-scripts.com',
      PRIVACY_KE_ORIGINS,
    ].join(' '),
    ['style-src', "'self'", "'unsafe-inline'", PRIVACY_KE_ORIGINS].join(' '),
    [
      'connect-src',
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.hcaptcha.com',
      'https://*.hcaptcha.com',
      'https://*.w.hcaptcha.com',
      PRIVACY_KE_ORIGINS,
      'https://api.paystack.co',
      'https://vitals.vercel-insights.com',
    ].join(' '),
    ['frame-src', 'https://*.hcaptcha.com', 'https://hcaptcha.com'].join(' '),
    [
      'img-src',
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://*.hcaptcha.com',
      'https://*.w.hcaptcha.com',
      PRIVACY_KE_ORIGINS,
    ].join(' '),
    ["font-src", "'self'"].join(' '),
    ["object-src", "'none'"].join(' '),
    ["base-uri", "'self'"].join(' '),
    [
      'form-action',
      "'self'",
      'https://checkout.paystack.com',
      'https://standard.paystack.co',
    ].join(' '),
    ["frame-ancestors", "'self'"].join(' '),
    ["worker-src", "'self'"].join(' '),
    ["manifest-src", "'self'"].join(' '),
  ]
  return directives.join('; ')
}

/**
 * @returns {{ key: string, value: string }[]}
 */
function getSecurityHeaders() {
  const headers = [
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ]

  // Strict CSP only in production: Turbopack/React dev needs eval(); local testing is easier without CSP.
  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Content-Security-Policy',
      value: buildContentSecurityPolicy(),
    })
    headers.unshift({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    })
  }

  return headers
}

module.exports = {
  buildContentSecurityPolicy,
  getSecurityHeaders,
}
