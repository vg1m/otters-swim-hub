/**
 * Session timeout policy.
 *
 * Two ceilings apply on top of whatever Supabase's own JWT lifetime is:
 *   - Idle timeout: sign out after 30 minutes of no user activity.
 *   - Absolute timeout: sign out 24 hours after sign-in, regardless of activity.
 *
 * Timestamps are stored in localStorage so they survive page reloads, and a
 * `storage` event listener keeps multiple tabs in sync (activity in one tab
 * counts as activity in the other).
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000
export const WARNING_LEAD_MS = 60 * 1000
export const TICK_INTERVAL_MS = 30 * 1000
export const ACTIVITY_THROTTLE_MS = 30 * 1000

export const LAST_ACTIVITY_KEY = 'otters.lastActivity'
export const SIGNED_IN_AT_KEY = 'otters.signedInAt'

/**
 * Read a millisecond timestamp from localStorage. Returns null when missing
 * or unparseable (treat as "unknown"; callers decide the fallback).
 */
export function readTimestamp(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeTimestamp(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Quota errors / Safari private mode - safe to ignore; the worst case is
    // the user keeps their session a little longer than intended.
  }
}

export function clearTimestamp(key) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function stampSignIn(now = Date.now()) {
  writeTimestamp(SIGNED_IN_AT_KEY, now)
  writeTimestamp(LAST_ACTIVITY_KEY, now)
}

export function stampActivity(now = Date.now()) {
  writeTimestamp(LAST_ACTIVITY_KEY, now)
}

export function clearSessionStamps() {
  clearTimestamp(LAST_ACTIVITY_KEY)
  clearTimestamp(SIGNED_IN_AT_KEY)
}
