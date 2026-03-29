import { parse } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

/**
 * Interpret session_date + end_time as wall-clock in `timeZone`, return UTC Date.
 * @param {string} sessionDate - ISO date 'yyyy-MM-dd'
 * @param {string} endTime - 'HH:mm:ss' or similar from Postgres TIME
 * @param {string} timeZone - IANA zone e.g. Africa/Nairobi
 */
export function getSessionEndUtc(sessionDate, endTime, timeZone) {
  const dateStr =
    typeof sessionDate === 'string' ? sessionDate.slice(0, 10) : String(sessionDate)
  const raw = String(endTime ?? '00:00:00')
  const parts = raw.split(':')
  const hh = (parts[0] ?? '0').padStart(2, '0')
  const mm = (parts[1] ?? '0').padStart(2, '0')
  const secPart = (parts[2] ?? '00').split('.')[0] ?? '00'
  const ss = secPart.padStart(2, '0')
  const wall = parse(`${dateStr} ${hh}:${mm}:${ss}`, 'yyyy-MM-dd HH:mm:ss', new Date(0))
  return fromZonedTime(wall, timeZone)
}
