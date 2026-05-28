import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

/** @returns {string} IANA timezone for club billing calendars */
export function getClubTimezone() {
  return process.env.APP_TIMEZONE || 'Africa/Nairobi'
}

/**
 * @param {Date | string | number} [date]
 * @returns {Date} Instant interpreted in club TZ wall clock (via UTC zoned conversion)
 */
export function toClubZonedDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return toZonedTime(d, getClubTimezone())
}

/**
 * @param {Date | string | number} [date]
 * @returns {{ year: number, month: number, day: number }}
 */
export function getClubDateParts(date = new Date()) {
  const z = toClubZonedDate(date)
  return {
    year: z.getFullYear(),
    month: z.getMonth() + 1,
    day: z.getDate(),
  }
}

/**
 * @param {Date | string | number} date
 * @param {string} pattern date-fns format pattern
 */
export function formatInClubTz(date, pattern) {
  return formatInTimeZone(date, getClubTimezone(), pattern)
}
