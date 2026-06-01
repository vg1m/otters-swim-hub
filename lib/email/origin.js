const DEFAULT_EMAIL_PUBLIC_ORIGIN = 'https://otters.ke'

/** Canonical site origin for URLs inside emails (defaults to https://otters.ke). */
export function emailPublicOrigin() {
  const raw = process.env.NEXT_PUBLIC_EMAIL_PUBLIC_URL?.trim()
  if (raw) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      return u.origin.replace(/\/+$/, '')
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_EMAIL_PUBLIC_ORIGIN
}

export function emailLoginUrl() {
  return `${emailPublicOrigin()}/login`
}

export function emailCoachHubUrl() {
  return `${emailPublicOrigin()}/coach`
}

export function emailSignupUrl() {
  const full = process.env.NEXT_PUBLIC_FAMILY_INVITE_SIGNUP_URL?.trim()
  if (full) {
    try {
      const u = new URL(full.startsWith('http') ? full : `https://${full}`)
      return u.href.replace(/\/+$/, '')
    } catch {
      /* ignore */
    }
  }
  return `${emailPublicOrigin()}/signup`
}

export function getEmailLogoUrl() {
  return `${emailPublicOrigin()}/otters-logo.png`
}
