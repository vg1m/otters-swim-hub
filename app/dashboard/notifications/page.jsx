'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import { formatKES } from '@/lib/utils/currency'
import {
  defaultAttendanceWindow,
  expandScheduledSessionsInWindow,
  fetchTrainingSessionsForAttendanceWindow,
} from '@/lib/parent/swimmerSchedule'
import { buildWeekScheduleByDay } from '@/lib/parent/buildParentWeekSchedule'
import { fetchParentIdsForDataAccess } from '@/lib/parent/effective-parent-ids'
import toast from 'react-hot-toast'

export default function ParentNotificationsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    setLoading(true)
    try {
      const { windowStart, windowEnd, windowEndStr } = defaultAttendanceWindow()
      const parentIds = await fetchParentIdsForDataAccess(supabase, user.id)

      const [swimmersResult, sessionsResult, invoicesResult] = await Promise.all([
        supabase
          .from('swimmers')
          .select('*, squads(id, name)')
          .in('parent_id', parentIds)
          .order('first_name', { ascending: true }),
        fetchTrainingSessionsForAttendanceWindow(supabase, windowEndStr),
        supabase
          .from('invoices')
          .select('*, swimmers (first_name, last_name)')
          .in('parent_id', parentIds)
          .in('status', ['issued', 'due'])
          .order('due_date', { ascending: true }),
      ])

      if (swimmersResult.error) throw swimmersResult.error
      setSwimmers(swimmersResult.data || [])

      if (sessionsResult.error) {
        console.error(sessionsResult.error)
        setScheduledSessions([])
      } else {
        setScheduledSessions(
          expandScheduledSessionsInWindow(
            sessionsResult.data || [],
            windowStart,
            windowEnd
          )
        )
      }

      if (invoicesResult.error) {
        console.error(invoicesResult.error)
        setOutstandingInvoices([])
      } else {
        setOutstandingInvoices(invoicesResult.data || [])
      }
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
    if (profile.role !== 'parent') {
      router.push(profile.role === 'admin' ? '/admin' : '/coach')
      return
    }
    load()
  }, [user, profile, authLoading, router, load])

  const notificationCount = useMemo(() => {
    const pending = swimmers.some((s) => s.status === 'pending') ? 1 : 0
    return outstandingInvoices.length + pending
  }, [outstandingInvoices.length, swimmers])

  const weekScheduleByDay = useMemo(
    () => buildWeekScheduleByDay(scheduledSessions, swimmers),
    [scheduledSessions, swimmers]
  )

  if (authLoading || !user || (user && !profile) || (profile?.role === 'parent' && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (profile?.role !== 'parent') {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 mb-3"
            >
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Notifications
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Alerts and your family&apos;s training schedule for this week (Mon–Sun). Data refreshes when you open this
              page.
            </p>
          </div>

          <div className="space-y-6">
            <Card padding="normal" id="parent-notifications">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Alerts</h2>
              {notificationCount === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No new notifications. You&apos;re all set.
                </p>
              ) : (
                <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200 min-w-0">
                  {outstandingInvoices.length > 0 && (
                    <li className="flex gap-2 min-w-0">
                      <span className="text-primary shrink-0 mt-0.5" aria-hidden>
                        •
                      </span>
                      <span className="min-w-0 break-words">
                        You have <strong>{outstandingInvoices.length}</strong> outstanding invoice
                        {outstandingInvoices.length === 1 ? '' : 's'} (
                        {formatKES(
                          outstandingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0)
                        )}
                        ).{' '}
                        <Link href="/invoices" className="text-primary font-medium hover:underline">
                          Open invoices
                        </Link>
                      </span>
                    </li>
                  )}
                  {swimmers.some((s) => s.status === 'pending') && (
                    <li className="flex gap-2 min-w-0">
                      <span className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden>
                        •
                      </span>
                      <span className="min-w-0 break-words">
                        At least one registration is still <strong>under review</strong>. The club will assign a squad
                        and coach. You&apos;ll see an invoice here when you can pay.
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </Card>

            <Card padding="normal">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">This week&apos;s training</h2>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Updated weekly. Shows sessions for swimmers with an approved squad assignment.
              </p>
              {swimmers.filter((s) => s.status === 'approved').length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
                  No approved swimmers with a squad yet. Your weekly schedule will appear here once assigned.
                </p>
              ) : weekScheduleByDay.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
                  No training sessions in your swimmers&apos; squads for this week.
                </p>
              ) : (
                <div className="space-y-5">
                  {weekScheduleByDay.map((day) => (
                    <div key={day.dateStr} className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                        {day.dayLabel}
                      </h3>
                      <ul className="space-y-1.5 list-none pl-0">
                        {day.lines.map((line, i) => (
                          <li
                            key={`${day.dateStr}-${i}`}
                            className="text-sm text-gray-800 dark:text-gray-200 break-words leading-relaxed"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
