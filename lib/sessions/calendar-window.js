import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'

/** Visible range for expanding occurrences on the calendar (±1 month, +2 months). */
export function adminCalendarWindowBounds(calendarDate) {
  const windowStart = startOfMonth(subMonths(calendarDate, 1))
  const windowEnd = endOfMonth(addMonths(calendarDate, 2))
  return {
    windowStart,
    windowEnd,
    windowStartStr: format(windowStart, 'yyyy-MM-dd'),
    windowEndStr: format(windowEnd, 'yyyy-MM-dd'),
  }
}

/** Wider DB fetch so May–June series still load when the calendar month is earlier. */
export function adminCalendarFetchBounds(calendarDate) {
  const display = adminCalendarWindowBounds(calendarDate)
  const fetchEnd = endOfMonth(addMonths(calendarDate, 12))
  return {
    ...display,
    fetchEndStr: format(fetchEnd, 'yyyy-MM-dd'),
  }
}

/**
 * Merge session rows by id (two-query fetch).
 * @param {Array<{ id: string }>} rows
 */
function mergeSessionsById(rows) {
  const byId = new Map()
  for (const row of rows || []) {
    if (row?.id) byId.set(row.id, row)
  }
  return [...byId.values()]
}

export const TRAINING_SESSION_SELECT_WITH_SQUADS = `
  *,
  training_session_squads (
    squad_id,
    squads (id, name, slug)
  )
`

export const TRAINING_SESSION_SELECT_COACH = `
  *,
  training_session_squads (
    squad_id,
    squads (name)
  )
`

export const TRAINING_SESSION_SELECT_PARENT = `
  *,
  training_session_squads (
    squad_id,
    squads (id, name)
  )
`

/**
 * Load sessions needed to expand occurrences in [windowStart, windowEnd].
 * Uses separate filters (not .or with embedded dates — hyphens break PostgREST).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} windowStartStr - yyyy-MM-dd
 * @param {string} windowEndStr - yyyy-MM-dd
 * @param {string} [select] - PostgREST select clause
 * @returns {Promise<{ data: object[]|null, error: object|null }>}
 */
export async function fetchSessionsForCalendarWindow(
  supabase,
  windowStartStr,
  fetchEndStr,
  select = TRAINING_SESSION_SELECT_WITH_SQUADS,
  { displayEndStr = fetchEndStr } = {}
) {
  const order = (q) =>
    q.order('session_date', { ascending: true }).order('start_time', { ascending: true })

  const [recurringRes, oneOffRes] = await Promise.all([
    order(
      supabase
        .from('training_sessions')
        .select(select)
        .eq('is_recurring', true)
        .lte('session_date', fetchEndStr)
    ),
    order(
      supabase
        .from('training_sessions')
        .select(select)
        .or('is_recurring.eq.false,is_recurring.is.null')
        .gte('session_date', windowStartStr)
        .lte('session_date', displayEndStr)
    ),
  ])

  if (recurringRes.error) return { data: null, error: recurringRes.error }
  if (oneOffRes.error) return { data: null, error: oneOffRes.error }

  return {
    data: mergeSessionsById([...(recurringRes.data || []), ...(oneOffRes.data || [])]),
    error: null,
  }
}

/**
 * Same as fetchSessionsForCalendarWindow but limited to given session ids.
 */
export async function fetchSessionsForCalendarWindowBySessionIds(
  supabase,
  sessionIds,
  windowStartStr,
  fetchEndStr,
  select = TRAINING_SESSION_SELECT_WITH_SQUADS,
  { displayEndStr = fetchEndStr } = {}
) {
  const ids = [...new Set((sessionIds || []).filter(Boolean))]
  if (ids.length === 0) {
    return { data: [], error: null }
  }

  const order = (q) =>
    q.order('session_date', { ascending: true }).order('start_time', { ascending: true })

  const [recurringRes, oneOffRes] = await Promise.all([
    order(
      supabase
        .from('training_sessions')
        .select(select)
        .in('id', ids)
        .eq('is_recurring', true)
        .lte('session_date', fetchEndStr)
    ),
    order(
      supabase
        .from('training_sessions')
        .select(select)
        .in('id', ids)
        .or('is_recurring.eq.false,is_recurring.is.null')
        .gte('session_date', windowStartStr)
        .lte('session_date', displayEndStr)
    ),
  ])

  if (recurringRes.error) return { data: null, error: recurringRes.error }
  if (oneOffRes.error) return { data: null, error: oneOffRes.error }

  return {
    data: mergeSessionsById([...(recurringRes.data || []), ...(oneOffRes.data || [])]),
    error: null,
  }
}

/**
 * Exceptions scoped to occurrence dates visible on the calendar.
 */
const SESSION_EXCEPTIONS_SELECT = `
  *,
  training_session_exception_squads (
    squad_id,
    squads ( id, name, slug )
  )
`

export function fetchSessionExceptionsForWindow(supabase, windowStartStr, windowEndStr) {
  return supabase
    .from('training_session_exceptions')
    .select(SESSION_EXCEPTIONS_SELECT)
    .gte('occurrence_date', windowStartStr)
    .lte('occurrence_date', windowEndStr)
}

/** Exceptions for specific series ids within a date window. */
export async function fetchSessionExceptionsForSessionIds(
  supabase,
  sessionIds,
  windowStartStr,
  windowEndStr
) {
  const ids = [...new Set((sessionIds || []).filter(Boolean))]
  if (ids.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('training_session_exceptions')
    .select(SESSION_EXCEPTIONS_SELECT)
    .in('session_id', ids)
    .gte('occurrence_date', windowStartStr)
    .lte('occurrence_date', windowEndStr)

  return { data: data || [], error }
}
