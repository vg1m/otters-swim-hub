import { getClubDateParts } from './billing-timezone.js'

/**
 * Standard window: 25th of anchor month through 3rd of the following month (club TZ).
 */
export function isInStandardEarlyBirdWindow(referenceDate, anchorDate) {
  const ref = getClubDateParts(referenceDate)
  const anchor = getClubDateParts(anchorDate)
  let nextYear = anchor.year
  let nextMonth = anchor.month + 1
  if (nextMonth > 12) {
    nextMonth = 1
    nextYear += 1
  }

  if (ref.year === anchor.year && ref.month === anchor.month && ref.day >= 25) {
    return true
  }
  if (ref.year === nextYear && ref.month === nextMonth && ref.day <= 3) {
    return true
  }
  return false
}

/**
 * Onboarding grace: pay by the 3rd of the calendar month after issue (club TZ).
 */
export function isOnboardingEarlyBirdGrace(referenceDate, invoiceIssuedAt) {
  const ref = getClubDateParts(referenceDate)
  const issued = getClubDateParts(invoiceIssuedAt)
  let endYear = issued.year
  let endMonth = issued.month + 1
  if (endMonth > 12) {
    endMonth = 1
    endYear += 1
  }
  if (ref.year < endYear) return true
  if (ref.year > endYear) return false
  if (ref.month < endMonth) return true
  if (ref.month > endMonth) return false
  return ref.day <= 3
}

/** Whether `referenceDate` falls in an active 25th→3rd window (no invoice context). */
export function isCurrentlyInEarlyBirdWindow(referenceDate = new Date()) {
  const ref = getClubDateParts(referenceDate)
  if (ref.day >= 25) {
    return isInStandardEarlyBirdWindow(referenceDate, referenceDate)
  }
  if (ref.day <= 3) {
    let py = ref.year
    let pm = ref.month - 1
    if (pm < 1) {
      pm = 12
      py -= 1
    }
    const anchor = new Date(Date.UTC(py, pm - 1, 15))
    return isInStandardEarlyBirdWindow(referenceDate, anchor)
  }
  return false
}

/**
 * @param {Date} [referenceDate]
 * @param {{ invoiceIssuedAt?: Date | string, isOnboarding?: boolean }} [options]
 */
export function isInEarlyBirdWindow(referenceDate = new Date(), options = {}) {
  const { invoiceIssuedAt, isOnboarding } = options

  if (invoiceIssuedAt) {
    if (isOnboarding && isOnboardingEarlyBirdGrace(referenceDate, invoiceIssuedAt)) {
      return true
    }
    return isInStandardEarlyBirdWindow(referenceDate, invoiceIssuedAt)
  }

  return isCurrentlyInEarlyBirdWindow(referenceDate)
}
