const DEFAULT_ORIGIN = 'https://otters.ke'

/** Canonical public site origin (production default: https://otters.ke). */
export function siteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_EMAIL_PUBLIC_URL?.trim()

  if (raw) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      return u.origin.replace(/\/+$/, '')
    } catch {
      /* ignore */
    }
  }

  return DEFAULT_ORIGIN
}
