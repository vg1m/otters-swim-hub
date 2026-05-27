'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NOTIFIER_REFRESH_EVENT } from '@/lib/notifications/notifier-refresh'

/**
 * Unread admin replies on parent_feedback (answered, response present, not yet read).
 */
export function useParentUnreadFeedbackRepliesCount(userId, enabled = true) {
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
      const probe = await supabase.from('parent_feedback').select('parent_read_at').limit(1)
      const hasReadAt = !(
        probe.error?.message?.includes('parent_read_at') &&
        probe.error?.message?.includes('does not exist')
      )
      if (!hasReadAt) {
        if (!cancelled) setUnreadCount(0)
        return
      }

      const { count, error } = await supabase
        .from('parent_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'answered')
        .not('admin_response', 'is', null)
        .is('parent_read_at', null)

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
    const onRefresh = () => run()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(NOTIFIER_REFRESH_EVENT, onRefresh)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(NOTIFIER_REFRESH_EVENT, onRefresh)
    }
  }, [userId, enabled, pathname])

  return unreadCount
}
