'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SessionDirectionsLink from '@/components/sessions/SessionDirectionsLink'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import { sessionMatchesSwimmerSquad } from '@/lib/parent/swimmerSchedule'
import { getAttendanceOccurrenceDateKey } from '@/lib/attendance/attendance-date-key'

const SwimmerCard = memo(function SwimmerCard({
  swimmer,
  sessions,
  scheduledSessions = [],
  attendance,
}) {
  const age = calculateAge(swimmer.date_of_birth)
  const nextSession = sessions.find((s) => sessionMatchesSwimmerSquad(s, swimmer.squad_id))
  const checkInCount = attendance.length

  const swimmerScheduled = useMemo(
    () => scheduledSessions.filter((s) => sessionMatchesSwimmerSquad(s, swimmer.squad_id)),
    [scheduledSessions, swimmer.squad_id]
  )

  const attendanceHint = useMemo(() => {
    if (!swimmer.squad_id || swimmerScheduled.length === 0) {
      return checkInCount > 0
        ? `${checkInCount} training check-in${checkInCount === 1 ? '' : 's'} on record`
        : null
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const pastDates = new Set()
    for (const s of swimmerScheduled) {
      if (s.session_date && s.session_date <= todayStr) pastDates.add(s.session_date)
    }
    if (pastDates.size === 0) {
      return checkInCount > 0
        ? `${checkInCount} training check-in${checkInCount === 1 ? '' : 's'} on record`
        : 'No past sessions in this schedule window yet'
    }
    let pastAttended = 0
    for (const d of pastDates) {
      if (attendance.some((a) => getAttendanceOccurrenceDateKey(a) === d)) pastAttended += 1
    }
    return `${pastAttended} of ${pastDates.size} scheduled day${pastDates.size === 1 ? '' : 's'} with attendance (to date)`
  }, [attendance, swimmerScheduled, swimmer.squad_id, checkInCount])

  return (
    <Card
      padding="normal"
      className="h-full hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {swimmer.first_name} {swimmer.last_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Age {age} · {swimmer.squads?.name || 'Squad pending'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant={swimmer.status === 'approved' ? 'success' : 'warning'} size="sm">
              {swimmer.status}
            </Badge>
            <Badge variant={swimmer.gala_events_opt_in ? 'success' : 'default'} size="sm">
              {swimmer.gala_events_opt_in ? 'Events: Opted in' : 'Events: Not opted in'}
            </Badge>
          </div>
        </div>

        {attendanceHint && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{attendanceHint}</p>
        )}

        {nextSession && (
          <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-600/50 space-y-1">
            <p>
              <span className="font-medium text-gray-900 dark:text-gray-100">Next session</span>
              <span className="text-gray-600 dark:text-gray-400"> · </span>
              {formatDate(nextSession.session_date)} at {nextSession.start_time}
            </p>
            {nextSession.pool_location && (
              <p className="text-gray-600 dark:text-gray-400 break-words">{nextSession.pool_location}</p>
            )}
            <SessionDirectionsLink session={nextSession} />
          </div>
        )}

        <Link href={`/swimmers/${swimmer.id}/performance`} className="block">
          <Button size="sm" variant="primary" fullWidth className="justify-center">
            Progress and attendance
          </Button>
        </Link>
      </div>
    </Card>
  )
})

export default SwimmerCard
