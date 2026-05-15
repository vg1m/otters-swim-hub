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

/** Forwards recovery auth query params to /reset-password or /auth/callback, and redirects
 *  stray recovery sessions (PASSWORD_RECOVERY or JWT `amr`) off public pages. */
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
      // Don't steal ?code= from OAuth: same param name as recovery PKCE.
      // `/auth/callback` consumes server-stored OAuth verifiers; `/login` + `/signup`
      // forward ?code= to `/auth/callback` in their own useEffects.
      if (
        !path.startsWith('/reset-password') &&
        !path.startsWith('/auth/callback') &&
        !path.startsWith('/login') &&
        !path.startsWith('/signup')
      ) {
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
