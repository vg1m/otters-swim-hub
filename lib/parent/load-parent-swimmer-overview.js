import {
  defaultAttendanceWindow,
  expandScheduledSessionsInWindow,
  fetchParentSwimmerScheduleBundle,
} from '@/lib/parent/swimmerSchedule'
import { fetchParentIdsForDataAccess } from '@/lib/parent/effective-parent-ids'

/**
 * Load swimmers plus schedule/attendance data for parent dashboard and /swimmers.
 */
export async function loadParentSwimmerOverview(supabase, userId) {
  const { now, windowStart, windowEnd, windowStartStr, windowEndStr } = defaultAttendanceWindow()
  const todayStr = now.toISOString().split('T')[0]
  const parentIds = await fetchParentIdsForDataAccess(supabase, userId)

  const swimmersResult = await supabase
    .from('swimmers')
    .select('*, squads(id, name)')
    .in('parent_id', parentIds)
    .order('first_name', { ascending: true })

  if (swimmersResult.error) {
    throw swimmersResult.error
  }

  const swimmersList = swimmersResult.data || []
  const swimmerIds = swimmersList.map((s) => s.id)

  const [scheduleBundle, attendanceResult] = await Promise.all([
    fetchParentSwimmerScheduleBundle(supabase, swimmersList, windowStartStr, windowEndStr),
    swimmerIds.length > 0
      ? supabase
          .from('attendance')
          .select(`
            *,
            occurrence_date,
            training_sessions (session_date)
          `)
          .in('swimmer_id', swimmerIds)
          .order('created_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ])

  let scheduledSessions = []
  let upcomingSessions = []

  if (scheduleBundle.error) {
    console.error('loadParentSwimmerOverview: sessions', scheduleBundle.error)
  } else {
    const expanded = expandScheduledSessionsInWindow(
      scheduleBundle.sessions || [],
      windowStart,
      windowEnd,
      scheduleBundle.exceptions
    )
    scheduledSessions = expanded
    upcomingSessions = expanded.filter((s) => s.session_date >= todayStr)
  }

  let attendanceBySwimmer = {}
  if (attendanceResult.error) {
    console.error('loadParentSwimmerOverview: attendance', attendanceResult.error)
  } else {
    attendanceBySwimmer = (attendanceResult.data || []).reduce((acc, att) => {
      if (!acc[att.swimmer_id]) acc[att.swimmer_id] = []
      acc[att.swimmer_id].push(att)
      return acc
    }, {})
  }

  return {
    swimmers: swimmersList,
    scheduledSessions,
    upcomingSessions,
    attendanceBySwimmer,
  }
}
