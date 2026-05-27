import { useEffect } from 'react'

/**
 * Re-run refresh when the user returns to the tab/window (e.g. after editing sessions elsewhere).
 */
export function useRefreshOnVisible(refresh, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof refresh !== 'function') return

    const run = () => refresh()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }

    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh, enabled])
}
