'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SwimmerCard from '@/components/parent/SwimmerCard'
import UpcomingSessionsList from '@/components/parent/UpcomingSessionsList'
import DashboardNextSessionStrip from '@/components/parent/DashboardNextSessionStrip'
import { formatKES } from '@/lib/utils/currency'
import {
  collectSwimmerSquadIds,
  sessionMatchesAnySwimmerSquad,
} from '@/lib/parent/swimmerSchedule'
import { fetchParentIdsForDataAccess } from '@/lib/parent/effective-parent-ids'
import { loadParentSwimmerOverview } from '@/lib/parent/load-parent-swimmer-overview'
import { useRefreshOnVisible } from '@/hooks/useRefreshOnVisible'
import { useParentUnreadNotificationsCount } from '@/hooks/useParentUnreadNotificationsCount'
import { useParentUnreadFeedbackRepliesCount } from '@/hooks/useParentUnreadFeedbackRepliesCount'
import QuickActionTile from '@/components/dashboard/QuickActionTile'
import {
  InvoicesQuickActionIcon,
  SwimmersQuickActionIcon,
  SettingsQuickActionIcon,
  FeedbackQuickActionIcon,
  NotificationsQuickActionIcon,
  SessionsQuickActionIcon,
} from '@/components/dashboard/ParentQuickActionIcons'
import toast from 'react-hot-toast'

function ParentDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [attendanceBySwimmer, setAttendanceBySwimmer] = useState({})
  const [loading, setLoading] = useState(true)
  const [sessionsPanelOpen, setSessionsPanelOpen] = useState(false)

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    const supabase = createClient()
    if (!silent) setLoading(true)

    try {
      const parentIds = await fetchParentIdsForDataAccess(supabase, user.id)

      const [overview, invoicesResult] = await Promise.all([
        loadParentSwimmerOverview(supabase, user.id),
        supabase
          .from('invoices')
          .select(`
            *,
            swimmers (first_name, last_name)
          `)
          .in('parent_id', parentIds)
          .in('status', ['issued', 'due'])
          .order('due_date', { ascending: true }),
      ])

      setSwimmers(overview.swimmers)
      setScheduledSessions(overview.scheduledSessions)
      setUpcomingSessions(overview.upcomingSessions)
      setAttendanceBySwimmer(overview.attendanceBySwimmer)

      if (invoicesResult.error) {
        console.error('Error loading invoices:', invoicesResult.error)
        setOutstandingInvoices([])
      } else {
        setOutstandingInvoices(invoicesResult.data || [])
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user])

  const isParent = profile?.role === 'parent'

  useEffect(() => {
    if (searchParams.get('swimmerApplication') === 'submitted') {
      toast.success(
        'Application submitted - we\'ll notify you when your swimmer is approved.'
      )
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (profile?.role === 'admin') {
        router.push('/admin')
        return
      }
      if (profile?.role === 'coach') {
        router.push('/coach')
        return
      }
      if (isParent) {
        loadDashboardData()
      }
    }
  }, [user, profile?.role, authLoading, isParent, loadDashboardData, router])

  useRefreshOnVisible(
    () => loadDashboardData({ silent: true }),
    isParent && Boolean(user?.id)
  )

  const displaySessions = useMemo(() => {
    const squadIds = collectSwimmerSquadIds(swimmers)
    return upcomingSessions
      .filter((s) => sessionMatchesAnySwimmerSquad(s, squadIds))
      .slice(0, 4)
  }, [upcomingSessions, swimmers])

  const sessionsThisWeek = useMemo(() => {
    const squadIds = collectSwimmerSquadIds(swimmers)
    const todayStr = new Date().toISOString().split('T')[0]
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]
    return upcomingSessions.filter(
      (s) =>
        s.session_date >= todayStr &&
        s.session_date <= weekEndStr &&
        sessionMatchesAnySwimmerSquad(s, squadIds)
    ).length
  }, [upcomingSessions, swimmers])

  const notificationCount = useMemo(() => {
    const invoiceCount = outstandingInvoices.length
    const pending = swimmers.some((s) => s.status === 'pending') ? 1 : 0
    return invoiceCount + pending
  }, [outstandingInvoices.length, swimmers])

  const unreadFeedCount = useParentUnreadNotificationsCount(
    user?.id,
    profile?.role === 'parent' && Boolean(user?.id)
  )
  const unreadFeedbackReplies = useParentUnreadFeedbackRepliesCount(
    user?.id,
    profile?.role === 'parent' && Boolean(user?.id)
  )

  const dashboardBadgeCount = unreadFeedCount + notificationCount

  const quickActions = useMemo(
    () => [
      {
        id: 'invoices',
        href: '/invoices',
        title: 'Invoices',
        subtitle:
          outstandingInvoices.length > 0
            ? `${outstandingInvoices.length} pending · payments`
            : 'Payments & history',
        theme: 'amber',
        icon: <InvoicesQuickActionIcon />,
      },
      {
        id: 'swimmers',
        href: '/swimmers',
        title: 'Swimmer Profiles',
        subtitle:
          swimmers.length === 1
            ? '1 swimmer'
            : swimmers.length > 0
              ? `${swimmers.length} swimmers`
              : 'View details',
        theme: 'green',
        icon: <SwimmersQuickActionIcon />,
      },
      {
        id: 'settings',
        href: '/settings',
        title: 'Profile Settings',
        subtitle: 'Manage info',
        theme: 'slate',
        icon: <SettingsQuickActionIcon />,
      },
      {
        id: 'feedback',
        href: '/dashboard/feedback',
        title: 'Feedback',
        subtitle:
          unreadFeedbackReplies > 0
            ? `${unreadFeedbackReplies} new ${unreadFeedbackReplies === 1 ? 'reply' : 'replies'}`
            : 'Message the club',
        theme: 'blue',
        icon: <FeedbackQuickActionIcon />,
        badgeCount: unreadFeedbackReplies,
        ariaLabel:
          unreadFeedbackReplies > 0
            ? `Feedback, ${unreadFeedbackReplies} new ${unreadFeedbackReplies === 1 ? 'reply' : 'replies'}`
            : 'Feedback',
      },
      {
        id: 'notifications',
        href: '/dashboard/notifications',
        title: 'Notifications',
        subtitle: (
          <>
            {notificationCount > 0
              ? `${notificationCount} alert${notificationCount === 1 ? '' : 's'}`
              : 'All caught up'}
            {unreadFeedCount > 0 && (
              <span className="block opacity-90">
                · {unreadFeedCount} new update{unreadFeedCount === 1 ? '' : 's'}
              </span>
            )}
          </>
        ),
        theme: 'purple',
        icon: <NotificationsQuickActionIcon />,
        badgeCount: dashboardBadgeCount,
        ariaLabel:
          dashboardBadgeCount > 0
            ? `Notifications, ${dashboardBadgeCount} unread or needing attention`
            : 'Notifications',
      },
      {
        id: 'schedule',
        title: 'Training Schedule',
        subtitle:
          sessionsThisWeek > 0
            ? `${sessionsThisWeek} this week`
            : 'View schedule',
        theme: 'cyan',
        icon: <SessionsQuickActionIcon />,
        ariaLabel: sessionsPanelOpen
          ? 'Hide training schedule'
          : 'Show training schedule',
      },
    ],
    [
      outstandingInvoices.length,
      swimmers.length,
      unreadFeedbackReplies,
      notificationCount,
      unreadFeedCount,
      dashboardBadgeCount,
      sessionsThisWeek,
      sessionsPanelOpen,
    ]
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      <Navigation />

      <div className="bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 pb-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {profile?.full_name}</p>
          </div>

          {swimmers.some((s) => s.status === 'pending') && (
            <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Application in review.</strong> The club is assigning a squad and coach. You will see an invoice
                here when you can pay. No payment is required until then.
              </p>
            </Card>
          )}

          {/* Quick Actions — 2×3 on mobile; 6 across on lg+ */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
              {quickActions.map((action) => (
                <QuickActionTile
                  key={action.id}
                  href={action.id === 'schedule' ? undefined : action.href}
                  onClick={
                    action.id === 'schedule'
                      ? () => {
                          if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
                            document.getElementById('upcoming-sessions')?.scrollIntoView({ behavior: 'smooth' })
                            return
                          }
                          setSessionsPanelOpen((open) => !open)
                        }
                      : undefined
                  }
                  title={action.title}
                  subtitle={action.subtitle}
                  theme={action.theme}
                  icon={action.icon}
                  badgeCount={action.badgeCount}
                  ariaLabel={action.ariaLabel}
                  isActive={action.id === 'schedule' && sessionsPanelOpen}
                />
              ))}
            </div>

            {displaySessions[0] && !sessionsPanelOpen && (
              <div className="mt-4 md:hidden">
                <DashboardNextSessionStrip
                  session={displaySessions[0]}
                  onOpenSchedule={() => setSessionsPanelOpen(true)}
                />
              </div>
            )}

            {sessionsPanelOpen && (
              <div className="mt-4 md:hidden">
                <UpcomingSessionsList
                  sessions={displaySessions}
                  showTitle={false}
                />
              </div>
            )}
          </div>

          {outstandingInvoices.length > 0 && (
            <div className="mb-6">
              <Card padding="normal" className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-400 dark:border-amber-600">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-7 w-7 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">Payment Required</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length > 1 ? 's' : ''}:{' '}
                        <span className="font-bold text-lg">
                          {formatKES(outstandingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0))}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Link href="/invoices">
                    <Button
                      variant="primary"
                      size="md"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      Pay Now →
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* My Swimmers — desktop only; mobile uses Swimmer Profiles quick action → /swimmers */}
          <div className="mb-6 hidden md:block">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  My Swimmers
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
                  Progress, race times, coach notes, and training attendance in one place.
                </p>
              </div>
              <Link href="/register" className="shrink-0">
                <Button size="sm" variant="secondary">
                  + Add Swimmer
                </Button>
              </Link>
            </div>
            {swimmers.length === 0 ? (
              <Card>
                <div className="text-center py-6">
                  <p className="text-gray-600 dark:text-gray-400">You don&apos;t have any registered swimmers yet.</p>
                  <Link href="/register">
                    <Button className="mt-4" size="sm">Register a Swimmer</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {swimmers.map((swimmer) => (
                  <SwimmerCard
                    key={swimmer.id}
                    swimmer={swimmer}
                    sessions={upcomingSessions}
                    scheduledSessions={scheduledSessions}
                    attendance={attendanceBySwimmer[swimmer.id] || []}
                  />
                ))}
              </div>
            )}
          </div>

          <div id="upcoming-sessions" className="mb-6 hidden md:block">
            <UpcomingSessionsList sessions={displaySessions} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default function ParentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <ParentDashboard />
    </Suspense>
  )
}
