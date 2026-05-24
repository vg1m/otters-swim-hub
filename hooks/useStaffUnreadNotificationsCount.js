'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Unread staff_notifications count for admin or coach nav badge.
 */
export function useStaffUnreadNotificationsCount(userId, role, enabled = true) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!enabled || !userId || (role !== 'admin' && role !== 'coach')) {
      setUnreadCount(0)
      return undefined
    }

    let cancelled = false

    async function run() {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('staff_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('role', role)
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
  }, [userId, role, enabled, pathname])

  return unreadCount
}
