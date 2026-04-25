import { formatDate, formatSessionTime } from '@/lib/utils/date-helpers'

export function coachPayEventDisplay(row) {
  const ts = row.training_sessions
  if (!ts) {
    return {
      recorded: row.created_at ? formatDate(row.created_at.split('T')[0]) : 'N/A',
      sessionLine: 'N/A',
      loc: null,
      amount: Number(row.amount_kes).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    }
  }
  const st = formatSessionTime(ts.start_time) || String(ts.start_time || '').slice(0, 5)
  const en = formatSessionTime(ts.end_time) || String(ts.end_time || '').slice(0, 5)
  return {
    recorded: row.created_at ? formatDate(row.created_at.split('T')[0]) : 'N/A',
    sessionLine: `${formatDate(ts.session_date)} · ${st}–${en}`,
    loc: ts.pool_location || null,
    amount: Number(row.amount_kes).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
  }
}
