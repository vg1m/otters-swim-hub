/** Decode access token and detect GoTrue `amr` recovery (password reset flow). */

function decodeJwtPayloadJson(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null
  const parts = accessToken.split('.')
  const payload = parts.length > 1 ? parts[1] : ''
  if (!payload) return null
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(payload, 'base64url').toString('utf8')
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4)
    return typeof atob !== 'undefined' ? atob(normalized + pad) : null
  } catch {
    return null
  }
}

/**
 * @param {string | undefined | null} accessToken
 * @param {{ disallowIfOauthInAmr?: boolean }} [opts]
 *   When disallowIfOauthInAmr is true, never treat the session as recovery if `amr` also
 *   records oauth (Google PKCE completes at /auth/callback with a JWT that can confuse
 *   recovery-only redirects).
 */
function amrIncludesMethod(amr, method) {
  if (!Array.isArray(amr)) return false
  return amr.some((entry) => {
    if (typeof entry === 'string') return entry === method
    return !!(entry && typeof entry === 'object' && entry.method === method)
  })
}

function amrIncludesOauth(amr) {
  return amrIncludesMethod(amr, 'oauth')
}

function readAmrFromAccessToken(accessToken, opts = {}) {
  const disallowIfOauthInAmr = opts.disallowIfOauthInAmr === true
  const json = decodeJwtPayloadJson(accessToken)
  if (!json) return null
  try {
    const decoded = JSON.parse(json)
    const amr = decoded.amr
    if (!Array.isArray(amr)) return null
    if (disallowIfOauthInAmr && amrIncludesOauth(amr)) return null
    return amr
  } catch {
    return null
  }
}

export function accessTokenIndicatesPasswordRecovery(accessToken, opts = {}) {
  const amr = readAmrFromAccessToken(accessToken, opts)
  if (!amr) return false
  return amrIncludesMethod(amr, 'recovery')
}

/** Coach/parent invite acceptance (GoTrue `amr` includes invite). */
export function accessTokenIndicatesInvite(accessToken, opts = {}) {
  const amr = readAmrFromAccessToken(accessToken, opts)
  if (!amr) return false
  return amrIncludesMethod(amr, 'invite')
}

/** Supabase invited users carry invited_at until they complete onboarding. */
export function userIndicatesPendingInvite(user) {
  if (!user || typeof user !== 'object') return false
  return Boolean(user.invited_at)
}
