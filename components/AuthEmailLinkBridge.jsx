'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const FINISH_INVITE = '/auth/finish-invite'
const SET_PASSWORD = '/auth/set-password'

function isAuthBridgePath(pathname) {
  if (!pathname) return false
  return (
    pathname.startsWith('/auth/finish-invite') ||
    pathname.startsWith('/auth/set-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/login')
  )
}

/**
 * When Supabase verify falls back to Site URL (/), invite tokens arrive as a URL hash.
 * Forward to finish-invite so session-from-hash + set-password can run.
 */
export default function AuthEmailLinkBridge() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined' || isAuthBridgePath(pathname)) return

    const url = new URL(window.location.href)
    const search = url.searchParams
    const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : ''
    const hp = rawHash ? new URLSearchParams(rawHash) : null

    const tokenHash = search.get('token_hash')
    const otpType = search.get('type')
    if (tokenHash && otpType === 'invite') {
      const params = new URLSearchParams({
        token_hash: tokenHash,
        type: otpType,
        next: SET_PASSWORD,
      })
      window.location.replace(`/auth/callback?${params.toString()}`)
      return
    }

    const accessToken = hp?.get('access_token')
    const refreshToken = hp?.get('refresh_token')
    if (accessToken && refreshToken) {
      void (async () => {
        try {
          const res = await fetch('/auth/session-from-hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              next: SET_PASSWORD,
            }),
          })
          let data = {}
          try {
            data = await res.json()
          } catch {
            //
          }
          if (res.ok && data?.ok) {
            window.location.replace(typeof data.next === 'string' ? data.next : SET_PASSWORD)
            return
          }
        } catch {
          //
        }
        window.location.replace(`${FINISH_INVITE}${url.hash}`)
      })()
    }
  }, [pathname])

  return null
}
