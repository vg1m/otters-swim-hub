'use client'

import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { accessTokenIndicatesPasswordRecovery } from '@/lib/utils/jwt-amr'

function shouldSendRecoveryToResetPage(pathname) {
  if (!pathname) return false
  if (pathname.startsWith('/reset-password')) return false
  if (pathname.startsWith('/auth/callback')) return false
  if (pathname.startsWith('/forgot-password')) return false
  if (pathname.startsWith('/login')) return false
  return true
}

/**
 * Global guard that catches password-recovery sessions regardless of where the link lands.
 *
 * Primary: Supabase fires PASSWORD_RECOVERY from onAuthStateChange when it processes any
 * recovery token (hash fragment, cookie, etc.). This is the official, config-agnostic signal.
 *
 * Fallback: on initial mount we call getSession() and decode the JWT amr claim to catch a
 * pre-existing recovery cookie (e.g. the user refreshes a page while the recovery session is
 * still alive and the browser client does not re-fire PASSWORD_RECOVERY).
 */
export default function RecoverySessionRedirect() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // If GoTrue falls back to the Site URL root, the one-time auth params land on "/" (or
    // another page). Forward them before RecoverySessionRedirect runs — otherwise we'd
    // navigate to /reset-password without ?code= and the link is consumed / unusable.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const path = url.pathname || ''
      // Don't steal ?code= from OAuth (/auth/callback) — same param name as password recovery PKCE.
      if (!path.startsWith('/reset-password') && !path.startsWith('/auth/callback')) {
        const code = url.searchParams.get('code')
        const token_hash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')
        if (code) {
          const next = new URL('/reset-password', url.origin)
          next.searchParams.set('code', code)
          const err = url.searchParams.get('error') || url.searchParams.get('error_description')
          if (err) next.searchParams.set('error', err)
          window.location.replace(next.pathname + next.search)
          return
        }
        if (token_hash && type) {
          const next = new URL('/auth/callback', url.origin)
          next.searchParams.set('token_hash', token_hash)
          next.searchParams.set('type', type)
          next.searchParams.set('next', '/reset-password')
          window.location.replace(next.href)
          return
        }
      }
    }

    const redirectIfRecovery = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : pathname
      if (shouldSendRecoveryToResetPage(path)) {
        window.location.replace('/reset-password')
      }
    }

    const maybeRedirectFromSession = (session) => {
      if (!session?.access_token) return
      if (!accessTokenIndicatesPasswordRecovery(session.access_token)) return
      redirectIfRecovery()
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      maybeRedirectFromSession(session)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        redirectIfRecovery()
        return
      }
      maybeRedirectFromSession(session)
    })

    return () => subscription.unsubscribe()
  }, [pathname, supabase])

  return null
}
