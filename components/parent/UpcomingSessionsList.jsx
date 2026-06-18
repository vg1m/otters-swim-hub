'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SessionDetailsModal from '@/components/SessionDetailsModal'
import { formatDate } from '@/lib/utils/date-helpers'

function sessionSquadNames(session) {
  const links = session.training_session_squads || []
  return links.map((l) => l.squads?.name).filter(Boolean)
}

export default function UpcomingSessionsList({
  sessions,
  title = 'Upcoming Training Sessions',
  showTitle = true,
  emptyMessage = 'No upcoming sessions scheduled',
  className = '',
}) {
  const [selectedSession, setSelectedSession] = useState(null)

  return (
    <div className={className}>
      {showTitle && (
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
      )}
      {sessions.length === 0 ? (
        <Card>
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const squadNames = sessionSquadNames(session)
            return (
              <button
                key={`${session.id}_${session.session_date}`}
                type="button"
                onClick={() => setSelectedSession(session)}
                className="text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              >
                <Card padding="normal" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex w-full min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(session.session_date)}
                      </p>
                      {session.is_recurring && (
                        <Badge variant="success" size="sm">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.start_time} – {session.end_time}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                      {session.pool_location}
                    </p>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {squadNames.length > 0 ? (
                        squadNames.map((name, i) => (
                          <Badge
                            key={`${name}-${i}`}
                            variant="info"
                            size="sm"
                            className="max-w-full !rounded-md whitespace-normal break-words text-left leading-snug"
                          >
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="info" size="sm" className="!rounded-md">
                          No squad
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-primary">View details →</span>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {selectedSession && (
        <SessionDetailsModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          session={selectedSession}
          attendanceStatus="upcoming"
        />
      )}
    </div>
  )
}
