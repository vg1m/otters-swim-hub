'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { profileCache } from '@/lib/cache/profile-cache'
import {
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  WARNING_LEAD_MS,
  TICK_INTERVAL_MS,
  ACTIVITY_THROTTLE_MS,
  LAST_ACTIVITY_KEY,
  SIGNED_IN_AT_KEY,
  readTimestamp,
  writeTimestamp,
  clearSessionStamps,
  stampActivity,
} from '@/lib/auth/session-timeout'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll']
const WARNING_TOAST_ID = 'idle-warning'

/**
 * Watches authenticated sessions and forces a sign-out when:
 *   - The user has been inactive for IDLE_TIMEOUT_MS, or
 *   - More than ABSOLUTE_TIMEOUT_MS has passed since the last successful sign-in.
 *
 * Mount once at the app root via <SessionTimeoutWatcher />. It is a no-op when
 * there is no Supabase session, so it is safe to run on public pages too.
 */
export function useSessionTimeout() {
  const router = useRouter()
  const supabaseRef = useRef(null)
  const tickRef = useRef(null)
  const lastStampRef = useRef(0)
  const warningShownRef = useRef(false)
  const signingOutRef = useRef(false)
  const activeRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    // ----- helpers -------------------------------------------------------

    function ensureSignedInStamp() {
      // Missing stamps on a live session means we just shipped the feature or
      // the user signed in via a different tab. Treat "now" as the anchor so
      // we never retroactively invalidate a working session.
      const now = Date.now()
      if (readTimestamp(SIGNED_IN_AT_KEY) == null) {
        writeTimestamp(SIGNED_IN_AT_KEY, now)
      }
      if (readTimestamp(LAST_ACTIVITY_KEY) == null) {
        writeTimestamp(LAST_ACTIVITY_KEY, now)
      }
    }

    function recordActivity() {
      if (!activeRef.current) return
      const now = Date.now()
      if (now - lastStampRef.current < ACTIVITY_THROTTLE_MS) return
      lastStampRef.current = now
      stampActivity(now)
      if (warningShownRef.current) {
        toast.dismiss(WARNING_TOAST_ID)
        warningShownRef.current = false
      }
    }

    function stayActive() {
      lastStampRef.current = 0
      recordActivity()
    }

    async function forceSignOut(reason) {
      if (signingOutRef.current) return
      signingOutRef.current = true
      try {
        toast.dismiss(WARNING_TOAST_ID)
        clearSessionStamps()
        profileCache.clearAll()
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Forced sign-out failed:', err)
      } finally {
        router.replace(`/login?reason=${encodeURIComponent(reason)}`)
      }
    }

    function showWarning() {
      if (warningShownRef.current) return
      warningShownRef.current = true
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              You will be signed out in 60 seconds.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id)
                  warningShownRef.current = false
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  stayActive()
                  toast.dismiss(t.id)
                }}
                className="text-xs font-semibold text-primary hover:opacity-80"
              >
                Stay signed in
              </button>
            </div>
          </div>
        ),
        { id: WARNING_TOAST_ID, duration: WARNING_LEAD_MS }
      )
    }

    function evaluate() {
      if (!activeRef.current) return
      const now = Date.now()
      const lastActivity = readTimestamp(LAST_ACTIVITY_KEY)
      const signedInAt = readTimestamp(SIGNED_IN_AT_KEY)

      // Defensive: if either key is missing we just re-anchor and continue.
      if (lastActivity == null || signedInAt == null) {
        ensureSignedInStamp()
        return
      }

      const idleFor = now - lastActivity
      if (idleFor >= IDLE_TIMEOUT_MS) {
        forceSignOut('idle')
        return
      }

      if (now - signedInAt >= ABSOLUTE_TIMEOUT_MS) {
        forceSignOut('expired')
        return
      }

      const msUntilIdle = IDLE_TIMEOUT_MS - idleFor
      if (msUntilIdle <= WARNING_LEAD_MS) {
        showWarning()
      } else if (warningShownRef.current) {
        toast.dismiss(WARNING_TOAST_ID)
        warningShownRef.current = false
      }
    }

    // ----- listeners -----------------------------------------------------

    function onStorage(event) {
      if (event.key === LAST_ACTIVITY_KEY && warningShownRef.current) {
        // Another tab registered activity: cancel the warning here too.
        toast.dismiss(WARNING_TOAST_ID)
        warningShownRef.current = false
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        evaluate()
      }
    }

    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, recordActivity, { passive: true })
    )
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)

    // ----- session gating ------------------------------------------------

    async function startIfSignedIn() {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          activeRef.current = true
          ensureSignedInStamp()
          evaluate()
          if (!tickRef.current) {
            tickRef.current = setInterval(evaluate, TICK_INTERVAL_MS)
          }
        }
      } catch (err) {
        console.error('Session check failed:', err)
      }
    }

    startIfSignedIn()

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        activeRef.current = true
        ensureSignedInStamp()
        if (!tickRef.current) {
          tickRef.current = setInterval(evaluate, TICK_INTERVAL_MS)
        }
      } else if (event === 'SIGNED_OUT') {
        activeRef.current = false
        warningShownRef.current = false
        signingOutRef.current = false
        toast.dismiss(WARNING_TOAST_ID)
        clearSessionStamps()
        if (tickRef.current) {
          clearInterval(tickRef.current)
          tickRef.current = null
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // A silent token refresh is not user activity. Do nothing.
      }
    })

    // ----- cleanup -------------------------------------------------------

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, recordActivity))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      authSub?.subscription?.unsubscribe()
    }
  }, [router])
}
