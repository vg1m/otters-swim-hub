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

/** @param {string | undefined | null} accessToken */
export function accessTokenIndicatesPasswordRecovery(accessToken) {
  const json = decodeJwtPayloadJson(accessToken)
  if (!json) return false
  try {
    const decoded = JSON.parse(json)
    const amr = decoded.amr
    if (!Array.isArray(amr)) return false
    return amr.some((entry) => {
      if (typeof entry === 'string') return entry === 'recovery'
      return entry && typeof entry === 'object' && entry.method === 'recovery'
    })
  } catch {
    return false
  }
}
