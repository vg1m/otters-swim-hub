/**
 * Calendar date for an attendance row (matches coach save + expanded schedule).
 * Recurring: occurrence_date; one-off: training_sessions.session_date.
 *
 * @param {{ occurrence_date?: string | null, training_sessions?: { session_date?: string } | null }} row
 * @returns {string | null} yyyy-MM-dd
 */
export function getAttendanceOccurrenceDateKey(row) {
  if (!row) return null

  const occ = row.occurrence_date
  if (occ != null && occ !== '') {
    return String(occ).slice(0, 10)
  }

  const raw = row.training_sessions?.session_date
  if (!raw) return null
  if (typeof raw === 'string') return raw.slice(0, 10)
  try {
    return new Date(raw).toISOString().slice(0, 10)
  } catch {
    return null
  }
}
