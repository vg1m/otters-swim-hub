/** Dispatched after notifier counts should re-fetch (e.g. feedback marked read). */
export const NOTIFIER_REFRESH_EVENT = 'otters-notifier-refresh'

export function emitNotifierRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFIER_REFRESH_EVENT))
  }
}
