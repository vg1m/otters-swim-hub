import { getClubDateParts } from './billing-timezone.js'

/** `YYYY-MM` for monthly training line items (club TZ). */
export function getMonthlyPeriodKey(date = new Date()) {
  const { year, month } = getClubDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Due date ISO string: 3rd of the calendar month after issue (club TZ), end of day.
 * @param {Date | string} issueDate
 */
export function getDueDateAfterIssue(issueDate = new Date()) {
  const { year, month } = getClubDateParts(issueDate)
  let dueYear = year
  let dueMonth = month + 1
  if (dueMonth > 12) {
    dueMonth = 1
    dueYear += 1
  }
  const due = new Date(Date.UTC(dueYear, dueMonth - 1, 3, 20, 59, 59, 999))
  return due.toISOString()
}
