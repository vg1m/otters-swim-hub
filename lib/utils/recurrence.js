/**
 * Recurrence Pattern Utilities
 * Helper functions to build, parse, and format recurrence patterns stored as JSONB
 */
import {
  addDays, addWeeks, addMonths, addYears,
  isAfter, isBefore, isEqual,
  startOfDay, startOfWeek, parseISO,
} from 'date-fns'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ORDINAL_NAMES = ['first', 'second', 'third', 'fourth', 'fifth']

/**
 * Build JSON pattern object from UI form inputs
 * @param {string} type - Pattern type
 * @param {object} options - Additional pattern parameters
 * @returns {object} JSON pattern object
 */
export function buildRecurrencePattern(type, options = {}) {
  const pattern = { type }

  switch (type) {
    case 'daily':
    case 'weekly':
    case 'biweekly':
    case 'monthly':
      // Simple patterns - type only
      break

    case 'weekly_on_day':
      pattern.weekday = parseInt(options.weekday)
      break

    case 'monthly_on_week_day':
      pattern.weekday = parseInt(options.weekday)
      pattern.ordinal = parseInt(options.ordinal)
      break

    case 'monthly_on_first_last':
      pattern.day_type = options.day_type // 'first' or 'last'
      break

    case 'annually':
      pattern.date = options.date // 'MM-DD' format
      break

    case 'custom':
      pattern.interval = parseInt(options.interval)
      pattern.unit = options.unit // 'day', 'week', 'month', 'year'
      if (options.weekdays && Array.isArray(options.weekdays)) {
        pattern.weekdays = options.weekdays.map(d => parseInt(d))
      }
      break

    default:
      console.warn('Unknown recurrence type:', type)
  }

  return pattern
}

/**
 * Parse JSON pattern for form editing
 * @param {object|string} pattern - JSON pattern object or string
 * @returns {object} Parsed pattern with type and options
 */
export function parseRecurrencePattern(pattern) {
  if (!pattern) {
    return { type: 'weekly', options: {} }
  }

  // Handle if pattern is already an object
  if (typeof pattern === 'object') {
    const result = {
      type: pattern.type || 'weekly',
      options: {}
    }

    switch (pattern.type) {
      case 'weekly_on_day':
        result.options.weekday = pattern.weekday?.toString() || '0'
        break

      case 'monthly_on_week_day':
        result.options.weekday = pattern.weekday?.toString() || '0'
        result.options.ordinal = pattern.ordinal?.toString() || '1'
        break

      case 'monthly_on_first_last':
        result.options.day_type = pattern.day_type || 'first'
        break

      case 'annually':
        result.options.date = pattern.date || ''
        break

      case 'custom':
        result.options.interval = pattern.interval?.toString() || '1'
        result.options.unit = pattern.unit || 'week'
        result.options.weekdays = pattern.weekdays || []
        break
    }

    return result
  }

  // Handle string - try JSON parse, fallback to old TEXT format
  let parsed
  try {
    parsed = JSON.parse(pattern)
  } catch (e) {
    // Old TEXT format (e.g., 'weekly', 'daily') - convert to new format
    parsed = { type: pattern }
  }

  const result = {
    type: parsed.type || 'weekly',
    options: {}
  }

  switch (parsed.type) {
    case 'weekly_on_day':
      result.options.weekday = parsed.weekday?.toString() || '0'
      break

    case 'monthly_on_week_day':
      result.options.weekday = parsed.weekday?.toString() || '0'
      result.options.ordinal = parsed.ordinal?.toString() || '1'
      break

    case 'monthly_on_first_last':
      result.options.day_type = parsed.day_type || 'first'
      break

    case 'annually':
      result.options.date = parsed.date || ''
      break

    case 'custom':
      result.options.interval = parsed.interval?.toString() || '1'
      result.options.unit = parsed.unit || 'week'
      result.options.weekdays = parsed.weekdays || []
      break
  }

  return result
}

/**
 * Format recurrence pattern for human-readable display
 * @param {object|string} pattern - JSON pattern object or string
 * @param {Date} sessionDate - Session date for context (optional)
 * @returns {string} Human-readable description
 */
export function formatRecurrencePattern(pattern, sessionDate = null) {
  if (!pattern) return 'One-time'

  // Handle if pattern is already an object
  if (typeof pattern === 'object') {
    const parsed = pattern
    
    switch (parsed.type) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'biweekly':
        return 'Bi-weekly'
      case 'monthly':
        return 'Monthly'
      case 'weekly_on_day':
        return `Weekly on ${WEEKDAY_NAMES[parsed.weekday] || 'Unknown'}`
      case 'monthly_on_week_day':
        const ordinal = ORDINAL_NAMES[parsed.ordinal - 1] || 'unknown'
        const weekday = WEEKDAY_NAMES[parsed.weekday] || 'Unknown'
        return `Monthly on the ${ordinal} ${weekday}`
      case 'monthly_on_first_last':
        return `Monthly on the ${parsed.day_type} day`
      case 'annually':
        if (parsed.date) {
          const [month, day] = parsed.date.split('-')
          const date = new Date(2000, parseInt(month) - 1, parseInt(day))
          return `Annually on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        }
        return 'Annually'
      case 'custom':
        let desc = `Every ${parsed.interval > 1 ? parsed.interval + ' ' : ''}${parsed.unit}${parsed.interval > 1 ? 's' : ''}`
        if (parsed.unit === 'week' && parsed.weekdays && parsed.weekdays.length > 0) {
          const days = parsed.weekdays.map(d => WEEKDAY_SHORT[d]).join(', ')
          desc += ` on ${days}`
        }
        return desc
      default:
        return 'Custom'
    }
  }

  // Handle if pattern is a string - try JSON parse, fallback to old TEXT format
  let parsed
  try {
    parsed = JSON.parse(pattern)
  } catch (e) {
    // Old TEXT format (e.g., 'weekly', 'daily') - display as-is
    return pattern.charAt(0).toUpperCase() + pattern.slice(1).replace('biweekly', 'Bi-weekly')
  }

  switch (parsed.type) {
    case 'daily':
      return 'Daily'

    case 'weekly':
      return 'Weekly'

    case 'biweekly':
      return 'Bi-weekly'

    case 'monthly':
      return 'Monthly'

    case 'weekly_on_day':
      return `Weekly on ${WEEKDAY_NAMES[parsed.weekday] || 'Unknown'}`

    case 'monthly_on_week_day':
      const ordinal = ORDINAL_NAMES[parsed.ordinal - 1] || 'unknown'
      const weekday = WEEKDAY_NAMES[parsed.weekday] || 'Unknown'
      return `Monthly on the ${ordinal} ${weekday}`

    case 'monthly_on_first_last':
      return `Monthly on the ${parsed.day_type} day`

    case 'annually':
      if (parsed.date) {
        const [month, day] = parsed.date.split('-')
        const date = new Date(2000, parseInt(month) - 1, parseInt(day))
        return `Annually on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
      }
      return 'Annually'

    case 'custom':
      let desc = `Every ${parsed.interval > 1 ? parsed.interval + ' ' : ''}${parsed.unit}${parsed.interval > 1 ? 's' : ''}`
      if (parsed.unit === 'week' && parsed.weekdays && parsed.weekdays.length > 0) {
        const days = parsed.weekdays.map(d => WEEKDAY_SHORT[d]).join(', ')
        desc += ` on ${days}`
      }
      return desc

    default:
      return 'Custom'
  }
}

/**
 * Get weekday from date
 * @param {Date|string} date - Date object or ISO string
 * @returns {number} Weekday (0=Sunday, 6=Saturday)
 */
export function getWeekday(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getDay()
}

/**
 * Get ordinal week of month (1st, 2nd, 3rd, 4th, 5th)
 * @param {Date|string} date - Date object or ISO string
 * @returns {number} Week of month (1-5)
 */
export function getOrdinalWeek(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const dayOfMonth = d.getDate()
  return Math.ceil(dayOfMonth / 7)
}

/**
 * Validate recurrence pattern object
 * @param {object} pattern - Pattern object to validate
 * @returns {boolean} True if valid
 */
export function validateRecurrencePattern(pattern) {
  if (!pattern || !pattern.type) return false

  switch (pattern.type) {
    case 'daily':
    case 'weekly':
    case 'biweekly':
    case 'monthly':
      return true

    case 'weekly_on_day':
      return typeof pattern.weekday === 'number' && pattern.weekday >= 0 && pattern.weekday <= 6

    case 'monthly_on_week_day':
      return (
        typeof pattern.weekday === 'number' && pattern.weekday >= 0 && pattern.weekday <= 6 &&
        typeof pattern.ordinal === 'number' && pattern.ordinal >= 1 && pattern.ordinal <= 5
      )

    case 'monthly_on_first_last':
      return pattern.day_type === 'first' || pattern.day_type === 'last'

    case 'annually':
      return /^\d{2}-\d{2}$/.test(pattern.date)

    case 'custom':
      return (
        typeof pattern.interval === 'number' && pattern.interval >= 1 &&
        ['day', 'week', 'month', 'year'].includes(pattern.unit)
      )

    default:
      return false
  }
}

/**
 * Get suggested pattern based on session date
 * @param {Date|string} sessionDate - Session date
 * @returns {object} Suggested pattern object
 */
export function getSuggestedPattern(sessionDate) {
  const date = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate
  const weekday = getWeekday(date)
  
  return buildRecurrencePattern('weekly_on_day', { weekday })
}

/**
 * Advance a date by one recurrence step according to the pattern.
 * Returns null if the pattern type is unrecognised.
 */
function advanceByPattern(current, pattern) {
  switch (pattern.type) {
    case 'daily':
      return addDays(current, 1)
    case 'weekly':
      return addWeeks(current, 1)
    case 'biweekly':
      return addWeeks(current, 2)
    case 'monthly':
      return addMonths(current, 1)
    case 'weekly_on_day':
      return addWeeks(current, 1)
    case 'monthly_on_week_day':
    case 'monthly_on_first_last':
      return addMonths(current, 1)
    case 'annually':
      return addYears(current, 1)
    case 'custom': {
      const interval = pattern.interval || 1
      switch (pattern.unit) {
        case 'day':   return addDays(current, interval)
        case 'week':  return addWeeks(current, interval)
        case 'month': return addMonths(current, interval)
        case 'year':  return addYears(current, interval)
        default:      return addWeeks(current, interval)
      }
    }
    default:
      return null
  }
}

/**
 * Nth specific-weekday of a given month, e.g. 2nd Wednesday of April 2026.
 * Returns null when the month doesn't contain that ordinal (e.g. no 5th Friday).
 *
 * @param {number} year
 * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
 * @param {number} weekday - 0=Sunday ... 6=Saturday
 * @param {number} ordinal - 1..5
 */
function nthWeekdayOfMonth(year, month, weekday, ordinal) {
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  const day = 1 + offset + (ordinal - 1) * 7
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  if (day > lastDayOfMonth) return null
  return new Date(year, month, day)
}

/** yyyy-MM-dd (local, no timezone shift). */
function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Expand sessions (including recurring ones) into individual occurrences
 * that fall within [windowStart, windowEnd].
 *
 * Each occurrence is a plain object with all original session fields plus
 * an overridden `session_date` string for the specific occurrence date.
 * Callers can pass this to the calendar as `resource` and still use the
 * original session id for Edit/Delete operations.
 *
 * @param {Array}  sessions    - Raw session rows from Supabase
 * @param {Date}   windowStart - Start of the visible calendar window
 * @param {Date}   windowEnd   - End of the visible calendar window
 * @returns {Array} Flat list of occurrence objects
 */
export function expandRecurringSessions(sessions, windowStart, windowEnd) {
  const results = []
  const winStart = startOfDay(windowStart)
  const winEnd   = startOfDay(windowEnd)
  const MAX_ITER = 2000

  for (const session of sessions) {
    const origin = startOfDay(
      typeof session.session_date === 'string'
        ? parseISO(session.session_date)
        : session.session_date
    )

    if (!session.is_recurring || !session.recurrence_pattern) {
      if (
        (isEqual(origin, winStart) || isAfter(origin, winStart)) &&
        (isEqual(origin, winEnd)   || isBefore(origin, winEnd))
      ) {
        results.push(session)
      }
      continue
    }

    const pattern =
      typeof session.recurrence_pattern === 'string'
        ? (() => { try { return JSON.parse(session.recurrence_pattern) } catch { return { type: session.recurrence_pattern } } })()
        : session.recurrence_pattern

    const hardEnd = session.recurrence_end_date
      ? startOfDay(
          typeof session.recurrence_end_date === 'string'
            ? parseISO(session.recurrence_end_date)
            : session.recurrence_end_date
        )
      : null

    const upperBound = hardEnd && isBefore(hardEnd, winEnd) ? hardEnd : winEnd

    const pushIfInWindow = (candidate) => {
      if (isBefore(candidate, origin)) return
      if (isAfter(candidate, upperBound)) return
      if (isBefore(candidate, winStart)) return
      results.push({ ...session, session_date: toDateString(candidate) })
    }

    // ── Anchored patterns: generate candidates per period ──────────────────
    if (pattern.type === 'custom' && pattern.unit === 'week' && Array.isArray(pattern.weekdays) && pattern.weekdays.length > 0) {
      const interval = Math.max(1, parseInt(pattern.interval, 10) || 1)
      const weekdays = [...pattern.weekdays].map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
      const originWeekStart = startOfWeek(origin, { weekStartsOn: 0 })
      for (let block = 0; block < MAX_ITER; block++) {
        const blockStart = addWeeks(originWeekStart, block * interval)
        if (isAfter(blockStart, upperBound)) break
        for (const wd of weekdays) {
          pushIfInWindow(addDays(blockStart, wd))
        }
      }
      continue
    }

    if (pattern.type === 'weekly_on_day') {
      const weekday = parseInt(pattern.weekday, 10)
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue
      const offset = (weekday - origin.getDay() + 7) % 7
      let current = addDays(origin, offset)
      for (let i = 0; i < MAX_ITER; i++) {
        if (isAfter(current, upperBound)) break
        pushIfInWindow(current)
        current = addWeeks(current, 1)
      }
      continue
    }

    if (pattern.type === 'monthly_on_week_day') {
      const weekday = parseInt(pattern.weekday, 10)
      const ordinal = parseInt(pattern.ordinal, 10)
      if (!Number.isInteger(weekday) || !Number.isInteger(ordinal)) continue
      let cursor = new Date(origin.getFullYear(), origin.getMonth(), 1)
      for (let i = 0; i < MAX_ITER; i++) {
        if (isAfter(cursor, upperBound)) break
        const candidate = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), weekday, ordinal)
        if (candidate) pushIfInWindow(candidate)
        cursor = addMonths(cursor, 1)
      }
      continue
    }

    if (pattern.type === 'monthly_on_first_last') {
      const dayType = pattern.day_type === 'last' ? 'last' : 'first'
      let cursor = new Date(origin.getFullYear(), origin.getMonth(), 1)
      for (let i = 0; i < MAX_ITER; i++) {
        if (isAfter(cursor, upperBound)) break
        const candidate = dayType === 'first'
          ? new Date(cursor.getFullYear(), cursor.getMonth(), 1)
          : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
        pushIfInWindow(candidate)
        cursor = addMonths(cursor, 1)
      }
      continue
    }

    if (pattern.type === 'annually' && typeof pattern.date === 'string' && /^\d{2}-\d{2}$/.test(pattern.date)) {
      const [mStr, dStr] = pattern.date.split('-')
      const month = parseInt(mStr, 10) - 1
      const day = parseInt(dStr, 10)
      let year = origin.getFullYear()
      for (let i = 0; i < MAX_ITER; i++) {
        const candidate = new Date(year, month, day)
        if (isAfter(candidate, upperBound)) break
        pushIfInWindow(candidate)
        year += 1
      }
      continue
    }

    // ── Unanchored / simple patterns: walk forward from origin ─────────────
    let current = origin
    for (let i = 0; i < MAX_ITER; i++) {
      if (isAfter(current, upperBound)) break
      pushIfInWindow(current)
      const next = advanceByPattern(current, pattern)
      if (!next || isEqual(next, current)) break
      current = next
    }
  }

  return results
}
