'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { STAFF_TYPE_META } from '@/lib/notifications/staff-notification-types'
import { useAutoMarkNotificationsRead } from '@/hooks/useAutoMarkNotificationsRead'
import toast from 'react-hot-toast'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CoachNotificationsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [payLineCount, setPayLineCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    setLoading(true)
    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoIso = weekAgo.toISOString()

      const [assignRes, payRes, notifRes] = await Promise.all([
        supabase
          .from('coach_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .gte('assigned_at', weekAgoIso),
        supabase
          .from('coach_session_pay_events')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .gte('created_at', weekAgoIso),
        supabase
          .from('staff_notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('role', 'coach')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      setAssignmentCount(assignRes.count ?? 0)
      setPayLineCount(payRes.count ?? 0)
      setNotifications(notifRes.error ? [] : notifRes.data || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!profile) return
    if (profile.role !== 'coach') {
      router.push(profile.role === 'admin' ? '/admin/notifications' : '/dashboard/notifications')
      return
    }
    load()
  }, [user, profile, authLoading, router, load])

  const alertCount = useMemo(() => {
    let n = 0
    if (assignmentCount > 0) n += 1
    if (payLineCount > 0) n += 1
    return n
  }, [assignmentCount, payLineCount])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  )

  useAutoMarkNotificationsRead({
    userId: user?.id,
    role: 'coach',
    notifications,
    setNotifications,
    loading,
  })

  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    setMarkingRead(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('staff_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('role', 'coach')
        .is('read_at', null)
      if (error) throw error
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      )
    } catch (e) {
      console.error(e)
      toast.error('Could not mark notifications as read')
    } finally {
      setMarkingRead(false)
    }
  }

  if (authLoading || !user || (user && !profile) || (profile?.role === 'coach' && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (profile?.role !== 'coach') return null

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <Link href="/coach" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 mb-3">
              ← Back to coach hub
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Assignments, session pay, and other updates for your coaching account.
            </p>
          </div>

          <div className="space-y-6">
            <Card padding="normal">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">This week</h2>
              {alertCount === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No new assignment or pay activity this week.</p>
              ) : (
                <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200 min-w-0">
                  {assignmentCount > 0 && (
                    <li className="flex gap-2 min-w-0">
                      <span className="text-primary shrink-0 mt-0.5" aria-hidden>•</span>
                      <span className="min-w-0 break-words">
                        <strong>{assignmentCount}</strong> assignment{assignmentCount === 1 ? '' : 's'} in the last 7
                        days.{' '}
                        <Link href="/coach" className="text-primary font-medium hover:underline">
                          Coach hub
                        </Link>
                      </span>
                    </li>
                  )}
                  {payLineCount > 0 && (
                    <li className="flex gap-2 min-w-0">
                      <span className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden>•</span>
                      <span className="min-w-0 break-words">
                        <strong>{payLineCount}</strong> session pay line{payLineCount === 1 ? '' : 's'} recorded this
                        week.{' '}
                        <Link href="/coach/earnings" className="text-primary font-medium hover:underline">
                          View earnings
                        </Link>
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </Card>

            <Card padding="normal">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent activity</h2>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-primary text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={markingRead}>
                    {markingRead ? 'Marking…' : 'Mark all as read'}
                  </Button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                  No activity yet. New assignments and session pay will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((n) => {
                    const meta = STAFF_TYPE_META[n.type] ?? { icon: '🔔', label: n.type }
                    const isUnread = !n.read_at
                    return (
                      <li
                        key={n.id}
                        className={`flex gap-3 py-3 min-w-0 ${isUnread ? 'bg-primary/5 dark:bg-primary/10 -mx-4 px-4 first:rounded-t-md last:rounded-b-md' : ''}`}
                      >
                        <span className="text-xl shrink-0 leading-none mt-0.5" aria-hidden>
                          {meta.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 break-words ${isUnread ? 'font-semibold' : ''}`}
                            >
                              {n.title}
                              {isUnread && (
                                <span
                                  className="ml-2 inline-block w-2 h-2 rounded-full bg-primary align-middle"
                                  aria-label="Unread"
                                />
                              )}
                            </p>
                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">{n.body}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
