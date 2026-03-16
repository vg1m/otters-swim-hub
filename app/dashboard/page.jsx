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
import AttendanceCalendarModal from '@/components/AttendanceCalendarModal'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import { formatKES } from '@/lib/utils/currency'
import { formatRecurrencePattern } from '@/lib/utils/recurrence'
import toast from 'react-hot-toast'

export default function ParentDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [attendanceBySwimmer, setAttendanceBySwimmer] = useState({})
  const [loading, setLoading] = useState(true)
  const dataLoadedRef = useRef(false)

  const loadDashboardData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    console.log('Starting to load dashboard data...')

    try {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // First load swimmers to get their IDs
      const swimmersResult = await supabase
        .from('swimmers')
        .select('*')
        .eq('parent_id', user.id)
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

      // Load rest of data in parallel
      const [sessionsResult, invoicesResult, attendanceResult] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('*')
          .gte('session_date', today)
          .lte('session_date', nextWeek)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true }),
        
        supabase
          .from('invoices')
          .select(`
            *,
            swimmers (first_name, last_name)
          `)
          .eq('parent_id', user.id)
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
              .limit(50)
          : Promise.resolve({ data: [], error: null })
      ])

      // Handle results
      if (sessionsResult.error) {
        console.error('Error loading sessions:', sessionsResult.error)
        setUpcomingSessions([])
      } else {
        setUpcomingSessions(sessionsResult.data || [])
      }

      if (invoicesResult.error) {
        console.error('Error loading invoices:', invoicesResult.error)
        setOutstandingInvoices([])
      } else {
        setOutstandingInvoices(invoicesResult.data || [])
      }

      // Group attendance by swimmer (limit to 5 most recent per swimmer)
      if (attendanceResult.error) {
        console.error('Error loading attendance:', attendanceResult.error)
        setAttendanceBySwimmer({})
      } else {
        const grouped = (attendanceResult.data || []).reduce((acc, att) => {
          if (!acc[att.swimmer_id]) {
            acc[att.swimmer_id] = []
          }
          if (acc[att.swimmer_id].length < 5) {
            acc[att.swimmer_id].push(att)
          }
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

          {/* Swimmers Section - COMPACT */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Swimmers</h2>
              <Link href="/register">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {swimmers.map((swimmer) => (
                  <SwimmerCard 
                    key={swimmer.id} 
                    swimmer={swimmer} 
                    sessions={upcomingSessions}
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
                {displaySessions.map((session) => (
                  <Card key={session.id} padding="normal">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(session.session_date)}</p>
                          {session.is_recurring && (
                            <Badge variant="success" size="sm">
                              🔁 {formatRecurrencePattern(session.recurrence_pattern)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{session.start_time} - {session.end_time}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">📍 {session.pool_location}</p>
                      </div>
                      <Badge variant="info">{session.squad.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

const SwimmerCard = memo(function SwimmerCard({ swimmer, sessions, attendance }) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const age = calculateAge(swimmer.date_of_birth)
  const nextSession = sessions.find(s => s.squad === swimmer.squad)
  const recentCount = attendance.slice(0, 5).length

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        {/* Compact Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {swimmer.first_name} {swimmer.last_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Age {age} • {swimmer.squad.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant={swimmer.status === 'approved' ? 'success' : 'warning'} size="sm">
              {swimmer.status}
            </Badge>
            <Badge variant={swimmer.gala_events_opt_in ? 'success' : 'default'} size="sm">
              {swimmer.gala_events_opt_in ? '🎉 Gala: Opted In' : 'Gala: Not Opted In'}
            </Badge>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <Button 
            size="sm" 
            variant="secondary"
            fullWidth
            onClick={() => setShowAttendanceModal(true)}
          >
            📅 Attendance {recentCount > 0 && `(${recentCount})`}
          </Button>
          <Link href={`/swimmers/${swimmer.id}/performance`} className="flex-1">
            <Button size="sm" variant="ghost" fullWidth>
              📈 Progress
            </Button>
          </Link>
        </div>
        
        {/* Next Session */}
        {nextSession && (
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
            <strong>Next:</strong> {formatDate(nextSession.session_date)} at {nextSession.start_time}
          </div>
        )}
      </div>

      {showAttendanceModal && (
        <AttendanceCalendarModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          swimmerId={swimmer.id}
          swimmerName={`${swimmer.first_name} ${swimmer.last_name}`}
          attendance={attendance}
        />
      )}
    </>
  )
})
