'use client'

import { useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  isAfter,
} from 'date-fns'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SessionDetailsModal from '@/components/SessionDetailsModal'
import { formatRecurrencePattern } from '@/lib/utils/recurrence'

const STATUS_CONFIG = {
  attended: {
    label: 'Attended',
    badge: 'success',
    cellClass: 'bg-green-500 text-white hover:bg-green-600',
  },
  missed: {
    label: 'Missed',
    badge: 'danger',
    cellClass: 'bg-red-500 text-white hover:bg-red-600',
  },
  upcoming: {
    label: 'Upcoming',
    badge: 'info',
    cellClass: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  'no-session': {
    label: 'No session',
    badge: 'default',
    cellClass:
      'bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
  },
}

function toDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

function sessionSquadsLabel(session) {
  const links = session?.training_session_squads || []
  return links.map((l) => l.squads?.name).filter(Boolean).join(', ') || '—'
}

/**
 * Parent-facing attendance calendar body (no modal wrapper).
 * @param {string} [className] — optional wrapper classes
 */
export default function AttendanceCalendarView({
  attendance = [],
  scheduledSessions = [],
  className = '',
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [detailsSession, setDetailsSession] = useState(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const today = startOfDay(new Date())

  const sessionsByDate = useMemo(() => {
    const map = new Map()
    for (const s of scheduledSessions) {
      if (!s?.session_date) continue
      const key = s.session_date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return map
  }, [scheduledSessions])

  const attendanceByDate = useMemo(() => {
    const map = new Map()
    for (const a of attendance) {
      const raw = a?.training_sessions?.session_date
      if (!raw) continue
      const key =
        typeof raw === 'string'
          ? raw.slice(0, 10)
          : format(new Date(raw), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    }
    return map
  }, [attendance])

  function statusFor(day) {
    const key = toDateKey(day)
    const sessions = sessionsByDate.get(key) || []
    if (sessions.length === 0) return 'no-session'
    if (isAfter(startOfDay(day), today)) return 'upcoming'
    const attended = attendanceByDate.get(key) || []
    return attended.length > 0 ? 'attended' : 'missed'
  }

  const monthStats = useMemo(() => {
    let attended = 0
    let missed = 0
    let upcoming = 0

    for (const day of eachDayOfInterval({ start: monthStart, end: monthEnd })) {
      const key = toDateKey(day)
      const sessions = sessionsByDate.get(key) || []
      if (sessions.length === 0) continue
      if (isAfter(startOfDay(day), today)) {
        upcoming += sessions.length
      } else {
        const rows = attendanceByDate.get(key) || []
        if (rows.length > 0) attended += Math.min(rows.length, sessions.length)
        else missed += sessions.length
      }
    }

    const denominator = attended + missed
    const rate = denominator === 0 ? null : Math.round((attended / denominator) * 100)

    return { attended, missed, upcoming, rate }
  }, [sessionsByDate, attendanceByDate, monthStart, monthEnd, today])

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
    setSelectedDate(null)
  }
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
    setSelectedDate(null)
  }
  const goToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(null)
  }

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null
  const selectedSessions = selectedKey ? sessionsByDate.get(selectedKey) || [] : []
  const selectedStatus = selectedDate ? statusFor(selectedDate) : null

  return (
    <>
      <div className={`space-y-4 ${className}`.trim()}>
        <div className="space-y-3">
          <div className="sm:hidden space-y-2">
            <h3 className="text-base font-semibold text-center text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" onClick={previousMonth} className="min-h-11">
                ← Prev
              </Button>
              <Button size="sm" variant="secondary" onClick={goToday} className="min-h-11">
                Today
              </Button>
              <Button size="sm" variant="secondary" onClick={nextMonth} className="min-h-11">
                Next →
              </Button>
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-between gap-3">
            <Button size="sm" variant="secondary" onClick={previousMonth}>
              ← Previous
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <Button size="sm" variant="secondary" onClick={goToday}>
                Today
              </Button>
            </div>
            <Button size="sm" variant="secondary" onClick={nextMonth}>
              Next →
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <LegendChip color="bg-green-500" label="Attended" />
          <LegendChip color="bg-blue-500" label="Upcoming" />
          <LegendChip color="bg-red-500" label="Missed" />
          <LegendChip
            color="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
            label="No session"
          />
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            const status = statusFor(day)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const cfg = STATUS_CONFIG[status]
            const hasSessions = status !== 'no-session'

            return (
              <button
                key={idx}
                type="button"
                onClick={() => (hasSessions ? setSelectedDate(day) : setSelectedDate(null))}
                aria-label={`${format(day, 'MMM d, yyyy')}: ${cfg.label}`}
                className={`
                    aspect-square flex items-center justify-center rounded-lg
                    text-xs sm:text-sm font-medium transition-all
                    ${cfg.cellClass}
                    ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${hasSessions ? 'cursor-pointer' : 'cursor-default'}
                  `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-800">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{format(selectedDate, 'EEEE')}</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>

            {selectedSessions.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No sessions scheduled for this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedSessions.map((session) => {
                  const sessionStatus = selectedStatus
                  const cfg = STATUS_CONFIG[sessionStatus]
                  return (
                    <li key={`${session.id}_${session.session_date}_${session.start_time}`}>
                      <button
                        type="button"
                        onClick={() => setDetailsSession({ session, status: sessionStatus })}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/60 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {session.start_time} – {session.end_time}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {session.pool_location || '—'} · {sessionSquadsLabel(session)}
                            </p>
                            {session.is_recurring && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Recurring · {formatRecurrencePattern(session.recurrence_pattern)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant={cfg.badge} size="sm">
                              {cfg.label}
                            </Badge>
                            <span className="text-xs text-primary">Details →</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <StatTile value={monthStats.attended} label="Attended" valueClass="text-green-600" />
          <StatTile
            value={monthStats.rate === null ? '—' : `${monthStats.rate}%`}
            label="Attendance rate"
            valueClass="text-blue-600"
          />
          <StatTile value={monthStats.missed} label="Missed" valueClass="text-red-600" />
        </div>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Rate uses sessions up to today in {format(currentMonth, 'MMMM yyyy')}
          {monthStats.upcoming > 0 ? ` · ${monthStats.upcoming} upcoming` : ''}
          {monthStats.rate === null ? ' · no completed sessions yet' : ''}
        </p>
      </div>

      {detailsSession && (
        <SessionDetailsModal
          isOpen={!!detailsSession}
          onClose={() => setDetailsSession(null)}
          session={detailsSession.session}
          attendanceStatus={detailsSession.status}
        />
      )}
    </>
  )
}

function LegendChip({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded ${color}`} />
      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  )
}

function StatTile({ value, label, valueClass }) {
  return (
    <div className="text-center">
      <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  )
}
