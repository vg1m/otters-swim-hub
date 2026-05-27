'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitNotifierRefresh } from '@/lib/notifications/notifier-refresh'

/**
 * Mark all unread notifications read when the notifications page is opened.
 * @param {{
 *   userId?: string,
 *   role: 'parent' | 'admin' | 'coach',
 *   notifications: Array<{ read_at?: string | null }>,
 *   setNotifications: (fn: (prev: any[]) => any[]) => void,
 *   loading: boolean,
 * }} opts
 */
export function useAutoMarkNotificationsRead({
  userId,
  role,
  notifications,
  setNotifications,
  loading,
}) {
  const markedRef = useRef(false)

  useEffect(() => {
    markedRef.current = false
  }, [userId])

  useEffect(() => {
    if (loading || !userId) return
    const unread = notifications.filter((n) => !n.read_at)
    if (unread.length === 0) return
    if (markedRef.current) return
    markedRef.current = true

    const now = new Date().toISOString()
    const supabase = createClient()

    ;(async () => {
      try {
        if (role === 'parent') {
          const { error } = await supabase
            .from('notifications')
            .update({ read_at: now })
            .eq('parent_id', userId)
            .is('read_at', null)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('staff_notifications')
            .update({ read_at: now })
            .eq('recipient_id', userId)
            .eq('role', role)
            .is('read_at', null)
          if (error) throw error
        }
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
        )
        emitNotifierRefresh()
      } catch (e) {
        console.error('useAutoMarkNotificationsRead:', e)
        markedRef.current = false
      }
    })()
  }, [loading, userId, role, notifications, setNotifications])
}
