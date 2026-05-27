'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NOTIFIER_REFRESH_EVENT } from '@/lib/notifications/notifier-refresh'

/**
 * Unread open parent_feedback for admin (open + not yet opened by admin).
 */
export function useAdminOpenFeedbackCount(userId, enabled = true) {
  const pathname = usePathname()
  const [openCount, setOpenCount] = useState(0)

  useEffect(() => {
    if (!enabled || !userId) {
      setOpenCount(0)
      return undefined
    }

    let cancelled = false

    async function run() {
      const supabase = createClient()

      let query = supabase
        .from('parent_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      const probe = await supabase.from('parent_feedback').select('admin_read_at').limit(1)
      const hasAdminReadAt = !(
        probe.error?.message?.includes('admin_read_at') &&
        probe.error?.message?.includes('does not exist')
      )
      if (hasAdminReadAt) {
        query = query.is('admin_read_at', null)
      }

      const { count, error } = await query

      if (cancelled) return
      if (error) {
        setOpenCount(0)
        return
      }
      setOpenCount(count ?? 0)
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

  return openCount
}
