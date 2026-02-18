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
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import { formatKES } from '@/lib/utils/currency'
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
  const loadingTimeoutRef = useRef(null)

  useEffect(() => {
    console.log('Dashboard effect:', { authLoading, user: !!user, profile })
    
    // Safety timeout - if loading takes more than 10 seconds, stop spinning
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('Loading timeout - forcing stop')
        setLoading(false)
        toast.error('Loading took too long. Please refresh the page.')
      }
    }, 10000)
    
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
      if (!dataLoadedRef.current) {
        console.log('Loading dashboard data...')
        dataLoadedRef.current = true
        loadDashboardData()
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [user, profile, authLoading])

  const loadDashboardData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

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
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      setLoading(false)
    }
  }, [user])

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {profile?.full_name}</p>
          </div>

          {/* Outstanding Invoices Alert */}
          {outstandingInvoices.length > 0 && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You have {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length > 1 ? 's' : ''}.{' '}
                    <Link href="/invoices" className="font-medium underline">
                      View invoices
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Swimmers Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">My Swimmers</h2>
            {swimmers.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">You don't have any registered swimmers yet.</p>
                  <Link href="/register">
                    <Button className="mt-4">Register a Swimmer</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* Upcoming Sessions Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Upcoming Training Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <Card>
                <p className="text-gray-600 text-center py-4">No upcoming sessions scheduled</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displaySessions.map((session) => (
                  <Card key={session.id} padding="normal">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(session.session_date)}</p>
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

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/check-in">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-4">
                    <svg className="mx-auto h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Check In</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Scan QR code at training</p>
                  </div>
                </Card>
              </Link>

              <Link href="/invoices">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-4">
                    <svg className="mx-auto h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">View Invoices</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Check payment status</p>
                  </div>
                </Card>
              </Link>

              <Link href="/swimmers">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-4">
                    <svg className="mx-auto h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Swimmer Profiles</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View details & attendance</p>
                  </div>
                </Card>
              </Link>

              <Link href="/settings">
                <Card padding="normal" className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-center py-4">
                    <svg className="mx-auto h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Profile Settings</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your information</p>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

const SwimmerCard = memo(function SwimmerCard({ swimmer, sessions, attendance }) {
  const nextSession = sessions.find(s => s.squad === swimmer.squad)
  const recentAttendance = attendance.slice(0, 5)

  return (
    <Card padding="normal">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {swimmer.first_name} {swimmer.last_name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{calculateAge(swimmer.date_of_birth)} years old</p>
        </div>
        <Badge variant={
          swimmer.status === 'approved' ? 'success' :
          swimmer.status === 'pending' ? 'warning' : 'default'
        }>
          {swimmer.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Squad:</span>
          <Badge variant="info">{swimmer.squad.replace('_', ' ').toUpperCase()}</Badge>
        </div>

        {nextSession && (
          <div className="mt-3 p-2 bg-accent rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Next Session:</p>
            <p className="text-sm font-semibold">{formatDate(nextSession.session_date)}</p>
            <p className="text-xs text-gray-600">{nextSession.start_time} - {nextSession.pool_location}</p>
          </div>
        )}

        {recentAttendance.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 font-medium mb-1">Recent Attendance:</p>
            <div className="flex gap-1">
              {recentAttendance.map((att, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-secondary rounded flex items-center justify-center"
                  title={formatDate(att.training_sessions?.session_date)}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})
