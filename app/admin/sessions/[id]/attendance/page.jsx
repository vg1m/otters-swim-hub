'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function SessionAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id
  const { user, profile, loading: authLoading } = useAuth()
  const [session, setSession] = useState(null)
  const [swimmers, setSwimmers] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    const userRole = profile?.role || cachedProfile?.role
    
    if (!authLoading) {
      if (!user || (userRole !== 'admin' && userRole !== 'coach')) {
        router.push('/login')
        return
      }
    }
    
    // Load data immediately if we have user and sessionId
    if (user && sessionId && !dataLoaded) {
      loadSessionData()
    }
  }, [user, authLoading, sessionId])

  async function loadSessionData() {
    if (dataLoaded) return
    const supabase = createClient()
    setLoading(true)

    try {
      // Load session with squads
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*, training_session_squads(squad_id, squads(id, name))')
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        console.error('Session fetch error:', sessionError)
        throw sessionError
      }

      let leadCoachFullName = null
      if (sessionData.coach_id) {
        const { data: lp, error: lpErr } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', sessionData.coach_id)
          .maybeSingle()
        if (lpErr) {
          console.warn('Lead coach name load:', lpErr)
        } else {
          leadCoachFullName = lp?.full_name?.trim() || null
        }
      }
      setSession({ ...sessionData, lead_coach_full_name: leadCoachFullName })

      // Load swimmers for all squads in this session
      const squadIds = sessionData.training_session_squads?.map(ts => ts.squad_id).filter(Boolean) || []
      let swimmersData = []
      let swimmersError = null
      if (squadIds.length > 0) {
        const result = await supabase
          .from('swimmers')
          .select('id, first_name, last_name, squad_id, squads(name)')
          .in('squad_id', squadIds)
          .eq('status', 'approved')
          .order('last_name', { ascending: true })
        swimmersData = result.data || []
        swimmersError = result.error
      } else {
        // Fall back: load all approved swimmers if no squads linked
        const result = await supabase
          .from('swimmers')
          .select('id, first_name, last_name, squad_id, squads(name)')
          .eq('status', 'approved')
          .order('last_name', { ascending: true })
        swimmersData = result.data || []
        swimmersError = result.error
      }

      if (swimmersError) {
        console.error('Swimmers fetch error:', swimmersError)
        throw swimmersError
      }
      setSwimmers(swimmersData || [])

      // Load existing attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)

      if (attendanceError) {
        console.error('Attendance fetch error:', attendanceError)
        throw attendanceError
      }

      const coachIds = [...new Set((attendanceData || []).map((a) => a.coach_id).filter(Boolean))]
      let coachNameById = {}
      if (coachIds.length > 0) {
        const { data: coachProfiles, error: coachProfErr } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', coachIds)
        if (coachProfErr) {
          console.warn('Coach names for attendance:', coachProfErr)
        } else {
          coachNameById = Object.fromEntries((coachProfiles || []).map((p) => [p.id, p.full_name]))
        }
      }

      const attendanceMap = {}
      attendanceData.forEach((att) => {
        attendanceMap[att.swimmer_id] = {
          id: att.id,
          checked_in_by: att.checked_in_by,
          check_in_time: att.check_in_time,
          coach_id: att.coach_id,
          coachName: att.coach_id ? coachNameById[att.coach_id] || null : null,
        }
      })
      setAttendance(attendanceMap)
      setDataLoaded(true)

    } catch (error) {
      console.error('Error loading session data:', error)
      toast.error('Failed to load session data')
    } finally {
      setLoading(false)
    }
  }

  /** Credits coach check-ins to the session lead when an admin clicks; coaches still credit themselves. */
  function coachCreditForNewCheckIn() {
    const cachedProfile = user ? profileCache.get(user.id) : null
    const userRole = profile?.role || cachedProfile?.role
    if (userRole === 'admin') {
      if (!session?.coach_id) {
        return { coach_id: null, coachName: null }
      }
      return {
        coach_id: session.coach_id,
        coachName: session.lead_coach_full_name || null,
      }
    }
    return {
      coach_id: user?.id ?? null,
      coachName: profile?.full_name || null,
    }
  }

  function toggleAttendance(swimmerId) {
    const credit = coachCreditForNewCheckIn()
    if (!credit.coach_id) {
      const cachedProfile = user ? profileCache.get(user.id) : null
      const userRole = profile?.role || cachedProfile?.role
      if (userRole === 'admin') {
        toast.error('Assign a lead coach to this session before recording coach check-ins.')
      }
      return
    }
    setAttendance((prev) => ({
      ...prev,
      [swimmerId]: prev[swimmerId]
        ? null
        : {
            checked_in_by: 'coach',
            new: true,
            coach_id: credit.coach_id,
            coachName: credit.coachName,
          },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    try {
      // Prepare inserts and deletes
      const toInsert = []
      const toDelete = []

      Object.entries(attendance).forEach(([swimmerId, att]) => {
        if (!att) {
          // Was checked in, now unchecked - delete
          const existing = swimmers.find(s => s.id === swimmerId)
          if (existing) {
            // Find the attendance id to delete
            const { data } = supabase
              .from('attendance')
              .select('id')
              .eq('session_id', sessionId)
              .eq('swimmer_id', swimmerId)
            toDelete.push(swimmerId)
          }
        } else if (att.new) {
          const { coach_id: creditCoachId } = coachCreditForNewCheckIn()
          if (!creditCoachId) {
            toast.error('Assign a lead coach to this session before recording coach check-ins.')
            throw new Error('No coach to credit')
          }
          toInsert.push({
            session_id: sessionId,
            swimmer_id: swimmerId,
            checked_in_by: 'coach',
            coach_id: creditCoachId,
            check_in_time: new Date().toISOString(),
          })
        }
      })

      // Delete unchecked
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('attendance')
          .delete()
          .eq('session_id', sessionId)
          .in('swimmer_id', toDelete)

        if (deleteError) throw deleteError
      }

      // Insert new
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(toInsert)

        if (insertError) throw insertError
      }

      toast.success('Attendance saved successfully')
      setDataLoaded(false)
      loadSessionData()
    } catch (error) {
      console.error('Error saving attendance:', error)
      if (error?.message !== 'No coach to credit') {
        toast.error('Failed to save attendance')
      }
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Session not found</p>
      </div>
    )
  }

  const checkedInCount = Object.values(attendance).filter(Boolean).length
  const cachedProfile = user ? profileCache.get(user.id) : null
  const userRole = profile?.role || cachedProfile?.role
  const backHref =
    userRole === 'coach'
      ? '/coach'
      : `/admin/sessions?date=${encodeURIComponent(session.session_date)}`
  const backLabel = userRole === 'coach' ? 'Back to coach dashboard' : 'Back to sessions calendar'

  function checkInByline(att) {
    if (!att?.checked_in_by) return null
    if (att.checked_in_by === 'self') {
      return 'Self check-in'
    }
    if (att.checked_in_by === 'coach') {
      if (user?.id && att.coach_id && att.coach_id === user.id) {
        const name = profile?.full_name?.trim()
        return name ? `Checked in by ${name}` : 'Checked in by you'
      }
      if (att.coachName?.trim()) {
        return `Checked in by ${att.coachName.trim()}`
      }
      return 'Checked in by coach'
    }
    return null
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Session Attendance</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {formatDate(session.session_date)} - {session.start_time} to {session.end_time}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              {session.training_session_squads?.map(ts => ts.squads?.name).filter(Boolean).join(', ') || 'No squad'} · {session.pool_location}
            </p>
          </div>

          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Attendance</p>
                <p className="text-3xl font-bold text-primary">
                  {checkedInCount} / {swimmers.length}
                </p>
              </div>
              <Button onClick={handleSave} loading={saving}>
                Save Attendance
              </Button>
            </div>
          </Card>

          <Card title="Swimmers">
            <div className="space-y-2">
              {swimmers.map((swimmer) => {
                const isCheckedIn = !!attendance[swimmer.id]
                const attRow = attendance[swimmer.id]
                const checkInLabel = isCheckedIn && attRow ? checkInByline(attRow) : null

                return (
                  <div
                    key={swimmer.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                      isCheckedIn
                        ? 'border-secondary bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isCheckedIn}
                        onChange={() => toggleAttendance(swimmer.id)}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {swimmer.first_name} {swimmer.last_name}
                        </p>
                        {checkInLabel ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{checkInLabel}</p>
                        ) : null}
                      </div>
                    </div>
                    {isCheckedIn && (
                      <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}
