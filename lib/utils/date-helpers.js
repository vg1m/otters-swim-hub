import { format, parseISO, differenceInYears } from 'date-fns'

// Format date to readable string
export function formatDate(date) {
  if (!date) return ''
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date
    return format(parsedDate, 'MMM dd, yyyy')
  } catch {
    return ''
  }
}

// Format datetime to readable string
export function formatDateTime(date) {
  if (!date) return ''
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date
    return format(parsedDate, 'MMM dd, yyyy h:mm a')
  } catch {
    return ''
  }
}

// Calculate age from date of birth
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0
  try {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth
    return differenceInYears(new Date(), dob)
  } catch {
    return 0
  }
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate() {
  return format(new Date(), 'yyyy-MM-dd')
}

// Get max date for DOB (18 years ago)
export function getMaxDOB() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return format(date, 'yyyy-MM-dd')
}

// Get min date for DOB (3 years ago)
export function getMinDOB() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 3)
  return format(date, 'yyyy-MM-dd')
}
