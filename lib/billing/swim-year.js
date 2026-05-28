import { getClubDateParts } from './billing-timezone.js'

/** @param {number} startYear Calendar year of September season start */
export function formatSwimYearLabel(startYear) {
  const endShort = (startYear + 1) % 100
  return `${startYear}-${String(endShort).padStart(2, '0')}`
}

/**
 * Calendar year of the September that opened the current swim year.
 * Sep–Dec → this year; Jan–Jul → previous year; Aug → this year (upcoming season).
 */
export function getSwimYearStartYear(date = new Date()) {
  const { year, month } = getClubDateParts(date)
  if (month >= 9) return year
  if (month <= 7) return year - 1
  return year
}

/** Swim year label for dates Sep–Jul (and Jul); use getRegistrationSwimYearLabel in August. */
export function getSwimYearLabel(date = new Date()) {
  return formatSwimYearLabel(getSwimYearStartYear(date))
}

/**
 * Swim year that begins the following September — for 25 Aug registration renewal.
 * In August: `${calendarYear}-${nextShort}` (e.g. 25 Aug 2026 → 2026-27).
 */
export function getUpcomingSwimYearLabel(date = new Date()) {
  const { year, month } = getClubDateParts(date)
  if (month === 8) return formatSwimYearLabel(year)
  if (month >= 9) return formatSwimYearLabel(year + 1)
  return formatSwimYearLabel(year)
}

/** Registration payment_period: upcoming label in August, current swim year otherwise. */
export function getRegistrationSwimYearLabel(date = new Date()) {
  const { month } = getClubDateParts(date)
  if (month === 8) return getUpcomingSwimYearLabel(date)
  return getSwimYearLabel(date)
}

/** True for Sep–Jul; false in August (no automated monthly training cron). */
export function isActiveSwimMonth(date = new Date()) {
  const { month } = getClubDateParts(date)
  return month !== 8
}

/** Months when quarterly training invoices are issued (25th). */
export const QUARTERLY_BILLING_MONTHS = [9, 12, 3, 6]

export function isQuarterlyBillingMonth(date = new Date()) {
  const { month } = getClubDateParts(date)
  return QUARTERLY_BILLING_MONTHS.includes(month)
}

/**
 * @param {Date} [date]
 * @returns {string | null} e.g. `2025-26-Q2` on 25 Dec 2025; null if not a quarter month
 */
export function getSwimQuarterKey(date = new Date()) {
  const { month } = getClubDateParts(date)
  const swimYear = getSwimYearLabel(date)
  const quarterByMonth = { 9: 1, 12: 2, 3: 3, 6: 4 }
  const q = quarterByMonth[month]
  if (!q) return null
  return `${swimYear}-Q${q}`
}

export function isAnnualRegistrationBillingDay(date = new Date()) {
  const { month, day } = getClubDateParts(date)
  return month === 8 && day === 25
}

export function isBillingDayOfMonth(date = new Date()) {
  return getClubDateParts(date).day === 25
}

/**
 * Swim quarter for onboarding / mid-season (not only on bill-day months).
 * Aug → upcoming Q1; Sep–Nov Q1; Dec–Feb Q2; Mar–May Q3; Jun–Jul Q4.
 */
export function getSwimQuarterKeyForOnboarding(date = new Date()) {
  const { month } = getClubDateParts(date)
  if (month === 8) {
    return `${getUpcomingSwimYearLabel(date)}-Q1`
  }
  const swimYear = getSwimYearLabel(date)
  if (month >= 9 && month <= 11) return `${swimYear}-Q1`
  if (month === 12 || month <= 2) return `${swimYear}-Q2`
  if (month >= 3 && month <= 5) return `${swimYear}-Q3`
  if (month >= 6 && month <= 7) return `${swimYear}-Q4`
  return `${swimYear}-Q1`
}
