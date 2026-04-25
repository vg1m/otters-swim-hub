import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { formatSessionTime } from '@/lib/utils/date-helpers'
import { sessionMatchesSwimmerSquad } from '@/lib/parent/swimmerSchedule'

/**
 * Mon–Sun current week, one line per approved swimmer per session (venue + time).
 * Returns array of { dateStr, dayLabel, lines: string[] }.
 */
export function buildWeekScheduleByDay(scheduledSessions, swimmers) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(weekEnd, 'yyyy-MM-dd')
  const approved = (swimmers || []).filter((s) => s.status === 'approved')
  if (approved.length === 0) return []

  const inWeek = (scheduledSessions || []).filter(
    (s) => s.session_date >= startStr && s.session_date <= endStr
  )
  const rows = []
  for (const session of inWeek) {
    for (const swimmer of approved) {
      if (sessionMatchesSwimmerSquad(session, swimmer.squad_id)) {
        const venue = (session.pool_location && String(session.pool_location).trim()) || 'N/A'
        const timeLabel =
          formatSessionTime(session.start_time) || (session.start_time || '').toString() || 'N/A'
        rows.push({
          dateStr: session.session_date,
          startTime: session.start_time || '',
          sortName: `${swimmer.first_name} ${swimmer.last_name}`.trim(),
          line: `${swimmer.first_name} ${swimmer.last_name} - ${venue}, ${timeLabel}`,
        })
      }
    }
  }
  const byDay = new Map()
  for (const r of rows) {
    if (!byDay.has(r.dateStr)) byDay.set(r.dateStr, [])
    byDay.get(r.dateStr).push(r)
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => {
      const tc = (a.startTime || '').localeCompare(b.startTime || '')
      if (tc !== 0) return tc
      return a.sortName.localeCompare(b.sortName)
    })
  }
  return [...byDay.keys()]
    .sort()
    .map((dateStr) => ({
      dateStr,
      dayLabel: format(parseISO(`${dateStr}T12:00:00`), 'EEE, MMM d'),
      lines: byDay.get(dateStr).map((r) => r.line),
    }))
}
