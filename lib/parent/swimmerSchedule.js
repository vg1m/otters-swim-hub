import { expandRecurringSessions } from '@/lib/utils/recurrence'
import {
  fetchSessionsForCalendarWindowBySessionIds,
  fetchSessionExceptionsForSessionIds,
  TRAINING_SESSION_SELECT_PARENT,
} from '@/lib/sessions/calendar-window'

export function collectSwimmerSquadIds(swimmers) {
  return [...new Set((swimmers || []).map((s) => s.squad_id).filter(Boolean))]
}

export function sessionMatchesSwimmerSquad(session, squadId) {
  if (!squadId) return false
  const links = session.training_session_squads || []
  return links.some((l) => l.squad_id === squadId)
}

/** True when the session targets at least one of the parent's swimmers' squads. */
export function sessionMatchesAnySwimmerSquad(session, squadIds) {
  const ids = squadIds instanceof Set ? squadIds : new Set(squadIds || [])
  if (ids.size === 0) return false
  const links = session.training_session_squads || []
  return links.some((l) => ids.has(l.squad_id))
}

export function filterSessionsForSwimmerSquads(sessions, swimmers) {
  const squadIds = collectSwimmerSquadIds(swimmers)
  if (squadIds.length === 0) return []
  return (sessions || []).filter((s) => sessionMatchesAnySwimmerSquad(s, squadIds))
}

export function expandScheduledSessionsInWindow(
  rawSessions,
  windowStart,
  windowEnd,
  exceptions = []
) {
  const expanded = expandRecurringSessions(
    rawSessions || [],
    windowStart,
    windowEnd,
    exceptions
  )
  return expanded.slice().sort((a, b) => {
    if (a.session_date !== b.session_date) {
      return a.session_date < b.session_date ? -1 : 1
    }
    return (a.start_time || '').localeCompare(b.start_time || '')
  })
}

export function defaultAttendanceWindow() {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
  const windowStartStr = windowStart.toISOString().split('T')[0]
  const windowEndStr = windowEnd.toISOString().split('T')[0]
  return { now, windowStart, windowEnd, windowStartStr, windowEndStr }
}

/**
 * Load training sessions for a parent's swimmers only (via squad junction).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ squad_id?: string|null }>} swimmers
 */
export async function fetchTrainingSessionsForParentSwimmers(
  supabase,
  swimmers,
  windowStartStr,
  windowEndStr
) {
  const squadIds = collectSwimmerSquadIds(swimmers)
  if (squadIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: links, error: linkError } = await supabase
    .from('training_session_squads')
    .select('session_id')
    .in('squad_id', squadIds)

  if (linkError) {
    return { data: null, error: linkError }
  }

  const sessionIds = [...new Set((links || []).map((l) => l.session_id).filter(Boolean))]
  return fetchSessionsForCalendarWindowBySessionIds(
    supabase,
    sessionIds,
    windowStartStr,
    windowEndStr,
    TRAINING_SESSION_SELECT_PARENT
  )
}

/**
 * Sessions + per-occurrence exceptions for parent/coach schedule views.
 */
export async function fetchParentSwimmerScheduleBundle(
  supabase,
  swimmers,
  windowStartStr,
  windowEndStr
) {
  const sessionsRes = await fetchTrainingSessionsForParentSwimmers(
    supabase,
    swimmers,
    windowStartStr,
    windowEndStr
  )
  if (sessionsRes.error) {
    return { sessions: null, exceptions: [], error: sessionsRes.error }
  }

  const sessionRows = sessionsRes.data || []
  const sessionIds = sessionRows.map((s) => s.id)
  const exceptionsRes = await fetchSessionExceptionsForSessionIds(
    supabase,
    sessionIds,
    windowStartStr,
    windowEndStr
  )

  return {
    sessions: sessionRows,
    exceptions: exceptionsRes.data || [],
    error: exceptionsRes.error,
  }
}
