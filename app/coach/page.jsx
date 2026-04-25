'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { calculateAge, formatDate, formatSessionTime } from '@/lib/utils/date-helpers'
import { buildDirectionsUrlFromLabel } from '@/lib/facilities/directions'
import {
  KpiSwimmersIcon,
  KpiSquadIcon,
  KpiAttendanceIcon,
  KpiOutstandingIcon,
} from '@/components/icons/DashboardKpiIcons'
import toast from 'react-hot-toast'

const COACH_SCHEDULE_DAYS = 30

export default function CoachDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [mySwimmers, setMySwimmers] = useState([])
  const [assignedSquadCount, setAssignedSquadCount] = useState(0)
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [stats, setStats] = useState({ totalSwimmers: 0, todaySessions: 0, totalSessions: 0 })
  const [perSessionRateKes, setPerSessionRateKes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [swimmerSearch, setSwimmerSearch] = useState('')
  const [swimmerSquadFilter, setSwimmerSquadFilter] = useState('all')

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
      const { data: rateRow, error: rateErr } = await supabase
        .from('profiles')
        .select('per_session_rate_kes')
        .eq('id', user.id)
        .single()
      if (rateErr) {
        console.warn('Coach rate load:', rateErr)
      } else {
        setPerSessionRateKes(rateRow?.per_session_rate_kes ?? null)
      }

      // Get coach squad assignments
      const { data: squadAssignments } = await supabase
        .from('coach_assignments')
        .select('squad_id, squads(id, name)')
        .eq('coach_id', user.id)
        .not('squad_id', 'is', null)

      const assignedSquadIds = [
        ...new Set((squadAssignments ?? []).map((a) => a.squad_id).filter(Boolean)),
      ]

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

      // Squads the coach touches: admin squad assignments plus each coached swimmer's squad (incl. individual-only)
      const squadsInCoachingScope = new Set(assignedSquadIds)
      for (const s of uniqueSwimmers) {
        if (s.squad_id) squadsInCoachingScope.add(s.squad_id)
      }
      setAssignedSquadCount(squadsInCoachingScope.size)

      // My Schedule: same squads as above; also sessions where this coach is the lead coach.
      const today = new Date().toISOString().split('T')[0]
      const scheduleEnd = new Date(
        Date.now() + COACH_SCHEDULE_DAYS * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0]

      const squadIdsForSchedule = squadsInCoachingScope

      const sessionById = new Map()
      const squadIdList = [...squadIdsForSchedule]

      if (squadIdList.length > 0) {
        const { data: sessionSquadLinks } = await supabase
          .from('training_session_squads')
          .select('session_id')
          .in('squad_id', squadIdList)

        const sessionIds = [...new Set(sessionSquadLinks?.map((l) => l.session_id) || [])]

        if (sessionIds.length > 0) {
          const { data: fromSquads, error: fromSqErr } = await supabase
            .from('training_sessions')
            .select('*, training_session_squads(squad_id, squads(name))')
            .in('id', sessionIds)
            .gte('session_date', today)
            .lte('session_date', scheduleEnd)
            .order('session_date')
            .order('start_time')
          if (fromSqErr) {
            console.warn('Coach schedule (squads):', fromSqErr)
          } else {
            for (const row of fromSquads || []) {
              sessionById.set(row.id, row)
            }
          }
        }
      }

      const { data: fromLeadCoach, error: fromCoachErr } = await supabase
        .from('training_sessions')
        .select('*, training_session_squads(squad_id, squads(name))')
        .eq('coach_id', user.id)
        .gte('session_date', today)
        .lte('session_date', scheduleEnd)
        .order('session_date')
        .order('start_time')
      if (fromCoachErr) {
        console.warn('Coach schedule (lead coach):', fromCoachErr)
      } else {
        for (const row of fromLeadCoach || []) {
          if (!sessionById.has(row.id)) sessionById.set(row.id, row)
        }
      }

      const sessionsData = Array.from(sessionById.values()).sort((a, b) => {
        if (a.session_date !== b.session_date) {
          return String(a.session_date).localeCompare(String(b.session_date))
        }
        return String(a.start_time || '').localeCompare(String(b.start_time || ''))
      })

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

  const coachSwimmerSquadOptions = useMemo(() => {
    const byId = new Map()
    for (const s of mySwimmers) {
      if (s.squad_id && s.squads?.name) {
        byId.set(s.squad_id, s.squads.name)
      }
    }
    return [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [mySwimmers])

  const filteredSwimmers = useMemo(() => {
    const q = swimmerSearch.trim().toLowerCase()
    return mySwimmers.filter((s) => {
      if (swimmerSquadFilter !== 'all' && s.squad_id !== swimmerSquadFilter) return false
      if (!q) return true
      const full = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase()
      const lic = String(s.license_number || '').toLowerCase()
      return (
        full.includes(q) ||
        lic.includes(q) ||
        (s.first_name && s.first_name.toLowerCase().includes(q)) ||
        (s.last_name && s.last_name.toLowerCase().includes(q))
      )
    })
  }, [mySwimmers, swimmerSearch, swimmerSquadFilter])

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
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-5 sm:py-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Coach Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              Welcome back, {profile?.full_name}
            </p>
          </div>

          {/* Stats: 2x2 on mobile, 4 across from md (matches admin dashboard rhythm) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-8">
            <Card
              padding="sm"
              className="bg-cyan-50/90 dark:bg-cyan-900/20 border-cyan-200/80 dark:border-cyan-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-cyan-800/90 dark:text-cyan-300/90 leading-tight">
                    <span className="sm:hidden">Swimmers</span>
                    <span className="hidden sm:inline">Total swimmers</span>
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-cyan-900 dark:text-cyan-100 mt-0.5 sm:mt-1 leading-none">
                    {stats.totalSwimmers}
                  </p>
                </div>
                <KpiSwimmersIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-cyan-600/80 dark:text-cyan-400/85" />
              </div>
            </Card>

            <Link
              href="/coach/earnings"
              className="block h-full min-h-0 rounded-lg no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              aria-label="What you earn per session. Open full pay history and rate details."
            >
              <Card
                padding="sm"
                className="h-full cursor-pointer text-left transition-shadow hover:shadow-md active:opacity-95 bg-slate-100/90 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-600 shadow-sm"
              >
                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 mb-0.5">
                  <span className="sm:hidden">View history</span>
                  <span className="hidden sm:inline">Open pay history &amp; details</span>
                </p>
                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 leading-tight">
                      <span className="sm:hidden">Earnings</span>
                      <span className="hidden sm:inline">What you earn (per session)</span>
                    </p>
                    {perSessionRateKes != null && Number(perSessionRateKes) > 0 ? (
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-300 mt-0.5 sm:mt-1 leading-tight break-words">
                        KES{' '}
                        {Number(perSessionRateKes).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    ) : (
                      <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Not set
                      </p>
                    )}
                  </div>
                  <KpiOutstandingIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-blue-500/70 dark:text-blue-400/80" />
                </div>
              </Card>
            </Link>

            <Card
              padding="sm"
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800 shadow-sm"
            >
              <div
                className="flex items-start justify-between gap-1.5 sm:gap-2"
                title="Distinct squads you cover: squad-level assignments from admin, plus the squad of each swimmer on your roster (individual and direct assignments included)."
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-blue-700/90 dark:text-blue-300/90 leading-tight">
                    <span className="sm:hidden">Squads</span>
                    <span className="hidden sm:inline">Squads you cover</span>
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-blue-900 dark:text-blue-100 mt-0.5 sm:mt-1 leading-none">
                    {assignedSquadCount}
                  </p>
                </div>
                <KpiSquadIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-blue-500/85 dark:text-blue-400/90" />
              </div>
            </Card>

            <Card
              padding="sm"
              className="bg-green-50 dark:bg-green-900/20 border-green-200/80 dark:border-green-800 shadow-sm"
            >
              <div
                className="flex items-start justify-between gap-1.5 sm:gap-2"
                title="Training sessions on today's date from the same list as “My Schedule” (your squads, squads of swimmers you coach, lead-coach sessions). Calendar count for today, not attendance or pay."
              >
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-green-800/90 dark:text-green-300/90 leading-tight">
                    {`Today's sessions`}
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-green-900 dark:text-green-100 mt-0.5 sm:mt-1 leading-none">
                    {stats.todaySessions}
                  </p>
                </div>
                <KpiAttendanceIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-emerald-600/80 dark:text-emerald-400/85" />
              </div>
            </Card>
          </div>

          {/* My Swimmers */}
          <Card
            title="My Swimmers"
            subtitle="Search and filter; list scrolls inside this area on long rosters."
            padding="normal"
            className="mb-6"
          >
            {mySwimmers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No swimmers assigned yet. Contact admin for squad or swimmer assignments.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end mb-3">
                  <div className="min-w-0 flex-1 sm:max-w-md">
                    <Input
                      placeholder="Search by name or license…"
                      value={swimmerSearch}
                      onChange={(e) => setSwimmerSearch(e.target.value)}
                      aria-label="Search swimmers"
                    />
                  </div>
                  <div className="w-full sm:w-52">
                    <Select
                      label="Squad"
                      value={swimmerSquadFilter}
                      onChange={(e) => setSwimmerSquadFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All squads' },
                        ...coachSwimmerSquadOptions,
                      ]}
                    />
                  </div>
                  {(swimmerSearch.trim() !== '' || swimmerSquadFilter !== 'all') && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setSwimmerSearch('')
                        setSwimmerSquadFilter('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {filteredSwimmers.length === mySwimmers.length
                    ? `${mySwimmers.length} swimmer${mySwimmers.length !== 1 ? 's' : ''}`
                    : `Showing ${filteredSwimmers.length} of ${mySwimmers.length}`}
                </p>
                {filteredSwimmers.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    No swimmers match your filters.
                  </p>
                ) : (
                  <div
                    className="max-h-[min(60vh,520px)] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 p-3"
                    role="region"
                    aria-label="Swimmer list"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredSwimmers.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 min-h-0 flex-1">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug break-words">
                                {row.first_name} {row.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Age {calculateAge(row.date_of_birth)}
                                {row.license_number ? (
                                  <span className="ml-1">· Lic. {row.license_number}</span>
                                ) : null}
                              </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <Badge variant="info" size="sm">
                                {row.squads?.name || 'Pending'}
                              </Badge>
                              <Badge
                                variant={row.status === 'approved' ? 'success' : 'warning'}
                                size="sm"
                              >
                                {row.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            fullWidth
                            className="mt-3"
                            onClick={() => router.push(`/swimmers/${row.id}/performance`)}
                          >
                            Progress
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Upcoming Sessions */}
          <Card
            title="My Schedule"
            subtitle={`Next ${COACH_SCHEDULE_DAYS} days - squads you coach, your swimmers' squads, and sessions where you are the lead coach.`}
            padding="normal"
          >
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600 dark:text-gray-400">
                  No sessions in this period. Check that training sessions use the right squads in Admin, or that
                  you are set as the session coach when appropriate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSessions.map((session) => {
                  const directionsUrl = buildDirectionsUrlFromLabel(session.pool_location)
                  return (
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
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 space-y-1">
                      <p className="break-words">📍 {session.pool_location || 'N/A'}</p>
                      {directionsUrl && (
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline inline-block"
                        >
                          Get directions →
                        </a>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      fullWidth
                      onClick={() => router.push(`/admin/sessions/${session.id}/attendance`)}
                    >
                      Manage Attendance
                    </Button>
                  </div>
                )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}
