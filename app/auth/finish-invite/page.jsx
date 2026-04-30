'use client'

import { useEffect, useState } from 'react'

const SET_PASSWORD = '/auth/set-password'
const MAX_FRAGMENT_WAIT_MS = 600
const FRAGMENT_POLL_MS = 50

/**
 * After Supabase `/auth/v1/verify`, the session is usually appended as a URL **hash**
 * (`#access_token=…`) or as `?code=` (PKCE). We also forward `token_hash` + `type` to `/auth/callback`.
 *
 * Important: `redirect_to` must be a **single path** (no nested `?next=`). Nested query strings in
 * `redirect_to` break how GoTrue merges tokens onto the final URL.
 */
export default function FinishInvitePage() {
  const [message, setMessage] = useState('Confirming your invite…')
  const [working, setWorking] = useState(true)

  useEffect(() => {
    let cancelled = false

    function parseCurrent() {
      const url = new URL(window.location.href)
      const search = url.searchParams
      const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : ''
      const hp = rawHash ? new URLSearchParams(rawHash) : null
      return {
        url,
        search,
        err: search.get('error') || search.get('error_description'),
        code: search.get('code'),
        token_hash: search.get('token_hash'),
        type: search.get('type'),
        rawHash,
        hashError: hp?.get('error') || hp?.get('error_description'),
        access_token: hp?.get('access_token'),
        refresh_token: hp?.get('refresh_token'),
      }
    }

    async function run() {
      try {
        let snap = parseCurrent()
        let waited = 0
        while (
          !cancelled &&
          !snap.rawHash &&
          !snap.code &&
          !(snap.token_hash && snap.type) &&
          waited < MAX_FRAGMENT_WAIT_MS
        ) {
          await new Promise((r) => setTimeout(r, FRAGMENT_POLL_MS))
          waited += FRAGMENT_POLL_MS
          snap = parseCurrent()
        }

        if (cancelled) return

        if (snap.err) {
          setWorking(false)
          setMessage(decodeURIComponent(snap.err.replace(/\+/g, ' ')))
          return
        }

        if (snap.hashError) {
          setWorking(false)
          setMessage(decodeURIComponent(snap.hashError.replace(/\+/g, ' ')))
          return
        }

        if (snap.code) {
          const next = snap.search.get('next') || SET_PASSWORD
          window.location.replace(`/auth/callback?${new URLSearchParams({ code: snap.code, next }).toString()}`)
          return
        }

        if (snap.token_hash && snap.type) {
          const params = new URLSearchParams({
            token_hash: snap.token_hash,
            type: snap.type,
            next: snap.search.get('next') || SET_PASSWORD,
          })
          window.location.replace(`/auth/callback?${params.toString()}`)
          return
        }

        if (!snap.rawHash) {
          setWorking(false)
          setMessage(
            'This link did not include a sign-in token. That often happens if the invite link was opened twice, previewed by email security software, or the destination URL was shortened. Ask an admin for a fresh invite and open it once from a normal browser (Chrome, Safari, or Edge)—tap the button in the email rather than copying only part of the link.'
          )
          return
        }

        window.history.replaceState(null, '', window.location.pathname + window.location.search)

        if (!snap.access_token || !snap.refresh_token) {
          setWorking(false)
          setMessage(
            'Could not confirm the invite from this link. Tap the invitation link directly in your email, or contact an admin for a new invite.'
          )
          return
        }

        const next = snap.search.get('next') || SET_PASSWORD
        const res = await fetch('/auth/session-from-hash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            access_token: snap.access_token,
            refresh_token: snap.refresh_token,
            next,
          }),
        })
        let data = {}
        try {
          data = await res.json()
        } catch {
          //
        }

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Could not activate your invite')
        }

        window.location.replace(typeof data.next === 'string' ? data.next : SET_PASSWORD)
      } catch (e) {
        if (!cancelled) {
          setWorking(false)
          setMessage(e.message || 'Something went wrong')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-sm">
        {working ? (
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : null}
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      </div>
    </div>
  )
}
