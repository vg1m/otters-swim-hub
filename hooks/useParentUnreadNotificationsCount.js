'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Count of persisted notifications with read_at IS NULL for this parent profile id.
 * Refetches on route changes and when the tab becomes visible again.
 */
export function useParentUnreadNotificationsCount(userId, enabled = true) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!enabled || !userId) {
      setUnreadCount(0)
      return undefined
    }

    let cancelled = false

    async function run() {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', userId)
        .is('read_at', null)

      if (cancelled) return
      if (error) {
        setUnreadCount(0)
        return
      }
      setUnreadCount(count ?? 0)
    }

    run()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId, enabled, pathname])

  return unreadCount
}
