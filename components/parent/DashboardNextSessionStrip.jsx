'use client'

import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SessionDirectionsLink from '@/components/sessions/SessionDirectionsLink'
import { formatDate } from '@/lib/utils/date-helpers'

function sessionSquadNames(session) {
  const links = session.training_session_squads || []
  return links.map((l) => l.squads?.name).filter(Boolean)
}

/**
 * Compact mobile strip: next upcoming session with tap to open full schedule panel.
 */
export default function DashboardNextSessionStrip({ session, onOpenSchedule }) {
  if (!session) return null

  const squadNames = sessionSquadNames(session)
  const squadLabel = squadNames.length > 0 ? squadNames.join(', ') : 'Your squad'

  return (
    <Card
      padding="sm"
      className="border-cyan-200/80 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-900/15 hover:shadow-md transition-shadow"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-800/90 dark:text-cyan-300/90">
        Next session
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 leading-snug">
        {formatDate(session.session_date)} · {session.start_time}
      </p>
      {session.pool_location && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">{session.pool_location}</p>
      )}
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">{squadLabel}</p>
      {session.is_recurring && (
        <Badge variant="success" size="sm" className="mt-2">
          Recurring
        </Badge>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
        <SessionDirectionsLink session={session} />
        <button
          type="button"
          onClick={onOpenSchedule}
          className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          View full schedule →
        </button>
      </div>
    </Card>
  )
}
