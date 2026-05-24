const DEFAULT_AUTH_REDIRECT_ORIGIN = 'https://otters.ke'

function normalizeOrigin(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : ''
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function originFromEnv() {
  for (const key of ['NEXT_PUBLIC_EMAIL_PUBLIC_URL', 'NEXT_PUBLIC_APP_URL']) {
    const normalized = normalizeOrigin(process.env[key])
    if (normalized) return normalized
  }
  return DEFAULT_AUTH_REDIRECT_ORIGIN
}

/**
 * Origin the user sees in the browser (e.g. https://otters.ke).
 * On Vercel with a custom domain, `request.url` can still show the *.vercel.app
 * host; `x-forwarded-host` reflects the public hostname for redirects (OAuth, etc.).
 */
export function getPublicOrigin(request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim()
    return `${forwardedProto}://${host}`
  }
  return new URL(request.url).origin
}

/**
 * Canonical origin for Supabase auth email redirects (coach invite, etc.).
 * Prefers the public hostname from the incoming request; never falls back to VERCEL_URL.
 */
export function getAuthRedirectOrigin(request) {
  if (request) {
    try {
      const fromRequest = normalizeOrigin(getPublicOrigin(request))
      if (fromRequest) return fromRequest
    } catch {
      /* ignore */
    }
  }
  return originFromEnv()
}
