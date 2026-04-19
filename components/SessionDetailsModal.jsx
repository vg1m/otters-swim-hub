'use client'

import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/date-helpers'
import { formatRecurrencePattern } from '@/lib/utils/recurrence'

function sessionSquadsLabel(session) {
  const links = session?.training_session_squads || []
  return links.map((l) => l.squads?.name).filter(Boolean).join(', ') || '—'
}

function statusBadge(status) {
  if (!status) return null
  const map = {
    attended: { label: 'Attended', variant: 'success' },
    missed: { label: 'Missed', variant: 'danger' },
    upcoming: { label: 'Upcoming', variant: 'info' },
  }
  const cfg = map[status]
  if (!cfg) return null
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}

/**
 * Read-only session details modal for parents. Used by the dashboard's
 * Upcoming Training Sessions list and by the attendance calendar's
 * per-day details panel.
 */
export default function SessionDetailsModal({ isOpen, onClose, session, attendanceStatus }) {
  if (!session) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Details"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatDate(session.session_date)}
          </span>
          {session.is_recurring && (
            <Badge variant="success" size="sm">
              Recurring · {formatRecurrencePattern(session.recurrence_pattern)}
            </Badge>
          )}
          {statusBadge(attendanceStatus)}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Time</dt>
            <dd className="text-gray-900 dark:text-gray-100 font-medium">
              {session.start_time} – {session.end_time}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Pool</dt>
            <dd className="text-gray-900 dark:text-gray-100 font-medium">
              {session.pool_location || '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">Squads</dt>
            <dd className="text-gray-900 dark:text-gray-100 font-medium">
              {sessionSquadsLabel(session)}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          Attendance is captured by the coach on the day of the session.
        </p>
      </div>
    </Modal>
  )
}
