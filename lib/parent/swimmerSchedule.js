import { expandRecurringSessions } from '@/lib/utils/recurrence'

export function sessionMatchesSwimmerSquad(session, squadId) {
  if (!squadId) return false
  const links = session.training_session_squads || []
  return links.some((l) => l.squad_id === squadId)
}

export function expandScheduledSessionsInWindow(rawSessions, windowStart, windowEnd) {
  const expanded = expandRecurringSessions(rawSessions || [], windowStart, windowEnd)
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
  const windowEndStr = windowEnd.toISOString().split('T')[0]
  return { now, windowStart, windowEnd, windowEndStr }
}

export function fetchTrainingSessionsForAttendanceWindow(supabase, windowEndStr) {
  return supabase
    .from('training_sessions')
    .select(
      `
      *,
      training_session_squads (
        squad_id,
        squads (id, name)
      )
    `
    )
    .lte('session_date', windowEndStr)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
}
