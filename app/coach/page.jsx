'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function CoachDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [mySwimmers, setMySwimmers] = useState([])
  const [mySquads, setMySquads] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [stats, setStats] = useState({ totalSwimmers: 0, todaySessions: 0, totalSessions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'coach') {
        router.push('/login')
        return
      }
    }
    
    if (user && profile?.role === 'coach') {
      loadCoachData()
    }
  }, [user, profile, authLoading])

  async function loadCoachData() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Get coach squad assignments
      const { data: squadAssignments } = await supabase
        .from('coach_assignments')
        .select('squad_id, squads(id, name)')
        .eq('coach_id', user.id)
        .not('squad_id', 'is', null)

      const assignedSquadIds = squadAssignments?.map(a => a.squad_id) || []
      const assignedSquadNames = squadAssignments?.map(a => a.squads?.name).filter(Boolean) || []
      setMySquads(assignedSquadNames)

      // Get swimmers (direct + squad-based)
      let swimmersData = []
      if (assignedSquadIds.length > 0) {
        const { data } = await supabase
          .from('swimmers')
          .select('*, squads(id, name)')
          .in('squad_id', assignedSquadIds)
          .eq('status', 'approved')
          .order('last_name')
        swimmersData = data || []
      }

      // Get individually assigned swimmers
      const { data: individualAssignments } = await supabase
        .from('coach_assignments')
        .select('swimmers(*, squads(id, name))')
        .eq('coach_id', user.id)
        .not('swimmer_id', 'is', null)

      const individualSwimmers = individualAssignments?.map(a => a.swimmers).filter(Boolean) || []

      // Get direct coach_id swimmers
      const { data: directSwimmerData } = await supabase
        .from('swimmers')
        .select('*, squads(id, name)')
        .eq('coach_id', user.id)
        .eq('status', 'approved')
        .order('last_name')

      // Combine and deduplicate
      const allSwimmers = [...swimmersData, ...individualSwimmers, ...(directSwimmerData || [])]
      const uniqueSwimmers = Array.from(new Map(allSwimmers.map(s => [s.id, s])).values())
      setMySwimmers(uniqueSwimmers)

      // Get upcoming sessions for assigned squads via junction table
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let sessionsData = []
      if (assignedSquadIds.length > 0) {
        const { data: sessionSquadLinks } = await supabase
          .from('training_session_squads')
          .select('session_id')
          .in('squad_id', assignedSquadIds)
        
        const sessionIds = [...new Set(sessionSquadLinks?.map(l => l.session_id) || [])]
        
        if (sessionIds.length > 0) {
          const { data } = await supabase
            .from('training_sessions')
            .select('*, training_session_squads(squad_id, squads(name))')
            .in('id', sessionIds)
            .gte('session_date', today)
            .lte('session_date', nextWeek)
            .order('session_date')
            .order('start_time')
          sessionsData = data || []
        }
      }

      setUpcomingSessions(sessionsData)

      // Calculate stats
      const todayStr = new Date().toISOString().split('T')[0]
      const todaySessions = sessionsData?.filter(s => s.session_date === todayStr).length || 0

      setStats({
        totalSwimmers: uniqueSwimmers.length,
        todaySessions,
        totalSessions: sessionsData?.length || 0,
      })
    } catch (error) {
      console.error('Error loading coach data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const swimmerColumns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Age {calculateAge(row.date_of_birth)}
          </p>
        </div>
      ),
    },
    {
      header: 'Squad',
      accessor: 'squad',
      render: (row) => (
        <Badge variant="info">{row.squads?.name || 'Pending'}</Badge>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.status === 'approved' ? 'success' : 'warning'}>
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/swimmers/${row.id}/performance`)}
        >
          Progress
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coach Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {profile?.full_name}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card padding="normal">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary mb-2">{stats.totalSwimmers}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Swimmers</p>
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600 mb-2">{mySquads.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Squad{mySquads.length !== 1 ? 's' : ''} Assigned
                </p>
                {mySquads.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {mySquads.join(', ')}
                  </p>
                )}
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600 mb-2">{stats.todaySessions}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sessions Today</p>
              </div>
            </Card>
          </div>

          {/* My Swimmers */}
          <Card title="My Swimmers" padding="normal" className="mb-6">
            {mySwimmers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No swimmers assigned yet. Contact admin for squad or swimmer assignments.
                </p>
              </div>
            ) : (
              <Table
                columns={swimmerColumns}
                data={mySwimmers}
                emptyMessage="No swimmers assigned"
              />
            )}
          </Card>

          {/* Upcoming Sessions */}
          <Card title="My Schedule" padding="normal">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600 dark:text-gray-400">No upcoming sessions for your squads</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(session.session_date)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.start_time} - {session.end_time}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(session.training_session_squads?.map(ts => ts.squads?.name).filter(Boolean) || []).map((name, i) => (
                          <Badge key={i} variant="info" size="sm">{name}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      📍 {session.pool_location}
                    </p>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      fullWidth
                      onClick={() => router.push(`/admin/sessions/${session.id}/attendance`)}
                    >
                      Manage Attendance
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}
