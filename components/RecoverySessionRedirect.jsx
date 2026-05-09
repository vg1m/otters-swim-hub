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
