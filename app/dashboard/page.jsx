'use client'

import { useEffect, useState, memo, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SessionDetailsModal from '@/components/SessionDetailsModal'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import { formatKES } from '@/lib/utils/currency'
import {
  defaultAttendanceWindow,
  expandScheduledSessionsInWindow,
  fetchTrainingSessionsForAttendanceWindow,
  sessionMatchesSwimmerSquad,
} from '@/lib/parent/swimmerSchedule'
import { fetchParentIdsForDataAccess } from '@/lib/parent/effective-parent-ids'
import toast from 'react-hot-toast'

function sessionSquadNames(session) {
  const links = session.training_session_squads || []
  return links.map((l) => l.squads?.name).filter(Boolean)
}

export default function ParentDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [attendanceBySwimmer, setAttendanceBySwimmer] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  const dataLoadedRef = useRef(false)

  const loadDashboardData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    console.log('Starting to load dashboard data...')

    try {
      const { now, windowStart, windowEnd, windowEndStr } = defaultAttendanceWindow()
      const todayStr = now.toISOString().split('T')[0]
      const parentIds = await fetchParentIdsForDataAccess(supabase, user.id)

      // First load swimmers to get their IDs (primary + linked family accounts)
      const swimmersResult = await supabase
        .from('swimmers')
        .select('*, squads(id, name)')
        .in('parent_id', parentIds)
        .order('first_name', { ascending: true })

      if (swimmersResult.error) {
        console.error('Error loading swimmers:', swimmersResult.error)
        setSwimmers([])
        setLoading(false)
        return
      }

      const swimmersList = swimmersResult.data || []
      setSwimmers(swimmersList)
      
      const swimmerIds = swimmersList.map(s => s.id)

      // Load rest of data in parallel. Sessions query pulls origins up to the
      // window end so expandRecurringSessions can materialise every occurrence
      // that lands in our ±6-month window, including recurring bases whose
      // origin date predates the window.
      const [sessionsResult, invoicesResult, attendanceResult] = await Promise.all([
        fetchTrainingSessionsForAttendanceWindow(supabase, windowEndStr),
        
        supabase
          .from('invoices')
          .select(`
            *,
            swimmers (first_name, last_name)
          `)
          .in('parent_id', parentIds)
          .in('status', ['issued', 'due'])
          .order('due_date', { ascending: true }),
        
        swimmerIds.length > 0
          ? supabase
              .from('attendance')
              .select(`
                *,
                training_sessions (session_date)
              `)
              .in('swimmer_id', swimmerIds)
              .order('created_at', { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [], error: null })
      ])

      // Expand recurring sessions across the ±6-month window once. This is
      // the canonical schedule used by the attendance calendar, the next-session
      // line on swimmer cards, and the Upcoming Training Sessions list.
      if (sessionsResult.error) {
        console.error('Error loading sessions:', sessionsResult.error)
        setScheduledSessions([])
        setUpcomingSessions([])
      } else {
        const expanded = expandScheduledSessionsInWindow(
          sessionsResult.data || [],
          windowStart,
          windowEnd
        )
        setScheduledSessions(expanded)
        setUpcomingSessions(expanded.filter((s) => s.session_date >= todayStr))
      }

      if (invoicesResult.error) {
        console.error('Error loading invoices:', invoicesResult.error)
        setOutstandingInvoices([])
      } else {
        setOutstandingInvoices(invoicesResult.data || [])
      }

      // Group all attendance rows by swimmer. The attendance calendar needs
      // every historical check-in to render a full monthly picture, so we no
      // longer cap to 5 records per swimmer.
      if (attendanceResult.error) {
        console.error('Error loading attendance:', attendanceResult.error)
        setAttendanceBySwimmer({})
      } else {
        const grouped = (attendanceResult.data || []).reduce((acc, att) => {
          if (!acc[att.swimmer_id]) {
            acc[att.swimmer_id] = []
          }
          acc[att.swimmer_id].push(att)
          return acc
        }, {})
        setAttendanceBySwimmer(grouped)
      }

    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      console.log('Dashboard data loaded, setting loading to false')
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    console.log('Dashboard effect:', { authLoading, user: !!user, profile })
    
    if (!authLoading) {
      if (!user) {
        console.log('No user, redirecting to login')
        router.push('/login')
        return
      }
      if (profile?.role === 'admin') {
        console.log('Admin user, redirecting to /admin')
        router.push('/admin')
        return
      }
      if (profile?.role === 'coach') {
        console.log('Coach user, redirecting to /coach')
        router.push('/coach')
        return
      }
      if (!dataLoadedRef.current && user) {
        console.log('Loading dashboard data...')
        dataLoadedRef.current = true
        loadDashboardData()
      }
    }
  }, [user, profile, authLoading, loadDashboardData])

  // Memoize filtered upcoming sessions to avoid re-computation
  const displaySessions = useMemo(() => 
    upcomingSessions.slice(0, 4),
    [upcomingSessions]
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
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {profile?.full_name}</p>
          </div>

          {swimmers.some((s) => s.status === 'pending') && (
            <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Application in review.</strong> The club is assigning a squad and coach. You will see an invoice
                here when you can pay — no payment is required until then.
              </p>
            </Card>
          )}

          {/* Quick Actions - MOVED TO TOP */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Link href="/invoices">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20 hover:border-primary/50">
                  <div className="text-center py-3">
                    <svg className="mx-auto h-10 w-10 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Invoices & Payments</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {outstandingInvoices.length > 0 
                        ? `${outstandingInvoices.length} pending`
                        : 'View history'
                      }
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/swimmers">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-3">
                    <svg className="mx-auto h-10 w-10 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Swimmer Profiles</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">View details</p>
                  </div>
                </Card>
              </Link>

              <Link href="/settings">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-3">
                    <svg className="mx-auto h-10 w-10 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Profile Settings</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Manage info</p>
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* Outstanding Invoices Alert - AFTER Quick Actions */}
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
                        {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length > 1 ? 's' : ''}: {' '}
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

          {/* Swimmers Section */}
          <div className="mb-6">
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
                  <p className="text-gray-600 dark:text-gray-400">You don't have any registered swimmers yet.</p>
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

          {/* Upcoming Sessions Section - LAST */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Upcoming Training Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <Card>
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">No upcoming sessions scheduled</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displaySessions.map((session) => {
                  const squadNames = sessionSquadNames(session)
                  return (
                  <button
                    key={`${session.id}_${session.session_date}`}
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    className="text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                  >
                    <Card padding="normal" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <div className="flex w-full min-w-0 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatDate(session.session_date)}
                          </p>
                          {session.is_recurring && (
                            <Badge variant="success" size="sm">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.start_time} – {session.end_time}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                          {session.pool_location}
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {squadNames.length > 0 ? (
                            squadNames.map((name, i) => (
                              <Badge
                                key={`${name}-${i}`}
                                variant="info"
                                size="sm"
                                className="max-w-full !rounded-md whitespace-normal break-words text-left leading-snug"
                              >
                                {name}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="info" size="sm" className="!rounded-md">
                              —
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-primary">View details →</span>
                      </div>
                    </Card>
                  </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSession && (
        <SessionDetailsModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          session={selectedSession}
          attendanceStatus="upcoming"
        />
      )}

      <Footer />
    </>
  )
}

const SwimmerCard = memo(function SwimmerCard({ swimmer, sessions, scheduledSessions = [], attendance }) {
  const age = calculateAge(swimmer.date_of_birth)
  const nextSession = sessions.find((s) => sessionMatchesSwimmerSquad(s, swimmer.squad_id))
  const checkInCount = attendance.length

  const swimmerScheduled = useMemo(
    () => scheduledSessions.filter((s) => sessionMatchesSwimmerSquad(s, swimmer.squad_id)),
    [scheduledSessions, swimmer.squad_id]
  )

  const attendanceHint = useMemo(() => {
    function attendanceDateKey(a) {
      const raw = a?.training_sessions?.session_date
      if (!raw) return null
      return typeof raw === 'string' ? raw.slice(0, 10) : new Date(raw).toISOString().slice(0, 10)
    }
    if (!swimmer.squad_id || swimmerScheduled.length === 0) {
      return checkInCount > 0
        ? `${checkInCount} training check-in${checkInCount === 1 ? '' : 's'} on record`
        : null
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const pastDates = new Set()
    for (const s of swimmerScheduled) {
      if (s.session_date && s.session_date <= todayStr) pastDates.add(s.session_date)
    }
    if (pastDates.size === 0) {
      return checkInCount > 0
        ? `${checkInCount} training check-in${checkInCount === 1 ? '' : 's'} on record`
        : 'No past sessions in this schedule window yet'
    }
    let pastAttended = 0
    for (const d of pastDates) {
      if (attendance.some((a) => attendanceDateKey(a) === d)) pastAttended += 1
    }
    return `${pastAttended} of ${pastDates.size} scheduled day${pastDates.size === 1 ? '' : 's'} with attendance (to date)`
  }, [attendance, swimmerScheduled, swimmer.squad_id, checkInCount])

  return (
    <Card
      padding="normal"
      className="h-full hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {swimmer.first_name} {swimmer.last_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Age {age} · {swimmer.squads?.name || 'Squad pending'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant={swimmer.status === 'approved' ? 'success' : 'warning'} size="sm">
              {swimmer.status}
            </Badge>
            <Badge variant={swimmer.gala_events_opt_in ? 'success' : 'default'} size="sm">
              {swimmer.gala_events_opt_in ? 'Events: Opted in' : 'Events: Not opted in'}
            </Badge>
          </div>
        </div>

        {attendanceHint && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{attendanceHint}</p>
        )}

        {nextSession && (
          <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-600/50">
            <span className="font-medium text-gray-900 dark:text-gray-100">Next session</span>
            <span className="text-gray-600 dark:text-gray-400"> · </span>
            {formatDate(nextSession.session_date)} at {nextSession.start_time}
          </div>
        )}

        <Link href={`/swimmers/${swimmer.id}/performance`} className="block">
          <Button size="sm" variant="primary" fullWidth className="justify-center">
            Progress and attendance
          </Button>
        </Link>
      </div>
    </Card>
  )
})
