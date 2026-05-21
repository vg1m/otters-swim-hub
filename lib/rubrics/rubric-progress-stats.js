/** Normalise Postgres DATE / ISO string for yyyy-mm-dd comparison. */
export function monthYearKey(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val.slice(0, 10)
  try {
    return new Date(val).toISOString().slice(0, 10)
  } catch {
    return String(val).slice(0, 10)
  }
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Short label for chart axis, e.g. "May '26". */
export function formatMonthShort(dateStr) {
  if (!dateStr) return ''
  const key = monthYearKey(dateStr)
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return `${MONTH_SHORT[m - 1]} '${String(y).slice(-2)}`
}

function meanRatings(rows) {
  const scores = (rows || [])
    .filter((r) => !r.is_na && r.rating != null)
    .map((r) => r.rating)
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Build per-month stats for charting from milestone ratings + attitude rows.
 * @param {Array<{ month_year: string, milestone_id: string, rating: number|null, is_na: boolean }>} ratingRows
 * @param {Map<string, 'skills'|'habits'>} milestoneSectionById
 * @param {Array<{ month_year: string, coach_rating: number|null }>} attitudeRows
 */
export function buildMonthlyProgressStats(ratingRows, milestoneSectionById, attitudeRows = []) {
  const byMonth = new Map()

  for (const r of ratingRows || []) {
    const key = monthYearKey(r.month_year)
    if (!key) continue
    if (!byMonth.has(key)) {
      byMonth.set(key, { monthYear: key, skills: [], habits: [], coachAttitude: null })
    }
    const bucket = byMonth.get(key)
    const section = milestoneSectionById.get(r.milestone_id)
    if (section === 'skills') bucket.skills.push(r)
    else if (section === 'habits') bucket.habits.push(r)
    else bucket.skills.push(r)
  }

  for (const a of attitudeRows || []) {
    const key = monthYearKey(a.month_year)
    if (!key) continue
    if (!byMonth.has(key)) {
      byMonth.set(key, { monthYear: key, skills: [], habits: [], coachAttitude: null })
    }
    const bucket = byMonth.get(key)
    if (a.coach_rating != null) bucket.coachAttitude = a.coach_rating
  }

  const months = [...byMonth.keys()].sort()
  return months.map((key) => {
    const b = byMonth.get(key)
    const skillsAvg = meanRatings(b.skills)
    const habitsAvg = meanRatings(b.habits)
    const all = [...b.skills, ...b.habits]
    const overallAvg = meanRatings(all)
    return {
      monthYear: key,
      label: formatMonthShort(key),
      skillsAvg,
      habitsAvg,
      overallAvg,
      coachAttitude: b.coachAttitude,
    }
  })
}
