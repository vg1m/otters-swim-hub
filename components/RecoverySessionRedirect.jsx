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
    // Note: ?code= URL forwarding is handled server-side in middleware (lib/supabase/middleware.js)
    // before any page renders, so the browser Supabase client (detectSessionInUrl:true) never
    // auto-exchanges an OAuth code without the httpOnly PKCE verifier.

    const redirectIfRecovery = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : pathname
      if (shouldSendRecoveryToResetPage(path)) {
        window.location.replace('/reset-password')
      }
    }

    const maybeRedirectFromSession = (session) => {
      if (!session?.access_token) return
      // Match /auth/callback: do not chase "recovery" if amr shows oauth (e.g. after Google sign-in).
      if (
        !accessTokenIndicatesPasswordRecovery(session.access_token, { disallowIfOauthInAmr: true })
      ) {
        return
      }
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      maybeRedirectFromSession(session)
    })

    return () => subscription.unsubscribe()
  }, [pathname, supabase])

  return null
}
