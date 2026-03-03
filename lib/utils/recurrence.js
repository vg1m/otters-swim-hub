/**
 * Recurrence Pattern Utilities
 * Helper functions to build, parse, and format recurrence patterns stored as JSONB
 */

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
