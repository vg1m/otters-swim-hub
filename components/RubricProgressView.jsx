'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RUBRIC_DATA, ATTITUDE_LABELS, hasRubric } from '@/lib/rubrics/rubric-data'

/** Normalise Postgres DATE / ISO string for yyyy-mm-dd comparison. */
function monthYearKey(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val.slice(0, 10)
  try {
    return new Date(val).toISOString().slice(0, 10)
  } catch {
    return String(val).slice(0, 10)
  }
}

/** Pick dropdown value after refetch; prefer coach-saved month, else keep selection if still valid. */
function pickSelectedMonth(unique, hint, previous) {
  if (!unique?.length) return null
  if (hint) {
    const h = monthYearKey(hint)
    const found = unique.find((u) => monthYearKey(u) === h)
    if (found !== undefined) return found
  }
  if (previous) {
    const p = monthYearKey(previous)
    const still = unique.find((u) => monthYearKey(u) === p)
    if (still !== undefined) return still
  }
  return unique[0]
}

function parseMonthDate(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatMonthLabel(dateStr) {
  if (!dateStr) return ''
  const { year, month } = parseMonthDate(dateStr)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** Rating badge colour + label. */
function ratingBadge(rating, isNA) {
  if (isNA) return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', label: 'N/A', strike: true }
  if (rating == null) return { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-300 dark:text-gray-600', label: '—', strike: false }
  if (rating === 4) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: '4', strike: false }
  if (rating === 3) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: '3', strike: false }
  return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: String(rating), strike: false }
}

/** Compute overall average across all rated (non-NA, non-null) milestones. */
function overallAverage(ratings) {
  const scores = Object.values(ratings)
    .filter((r) => !r.is_na && r.rating != null)
    .map((r) => r.rating)
  if (scores.length === 0) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
}

export default function RubricProgressView({ swimmerId, squadSlug, refreshNonce = 0, savedMonthYear = null }) {
  const rubric = RUBRIC_DATA[squadSlug]

  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [milestoneMap, setMilestoneMap] = useState({})  // key → { id, domain_id, is_custom }
  const [ratings, setRatings] = useState({})             // milestone_id → { rating, is_na }
  const [attitudeRating, setAttitudeRating] = useState(null)
  const [loading, setLoading] = useState(false)

  // Load month list whenever swimmer loads or coach saves an evaluation above
  useEffect(() => {
    if (!swimmerId) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('swimmer_milestone_ratings')
        .select('month_year')
        .eq('swimmer_id', swimmerId)
        .order('month_year', { ascending: false })
      if (cancelled) return
      const unique = [...new Set((data || []).map((r) => r.month_year))]
      setAvailableMonths(unique)
      setSelectedMonth((prev) => pickSelectedMonth(unique, savedMonthYear, prev))
    })()
    return () => {
      cancelled = true
    }
  }, [swimmerId, refreshNonce, savedMonthYear])

  // Load milestone map and ratings for selected month
  const loadRatings = useCallback(async () => {
    if (!squadSlug || !hasRubric(squadSlug) || !swimmerId) return
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: domains } = await supabase
        .from('rubric_domains')
        .select('id, domain_name, section, rubric_milestones(id, text, sort_order, is_custom)')
        .eq('squad_slug', squadSlug)
        .order('sort_order')

      const map = {}
      for (const domain of domains || []) {
        for (const m of domain.rubric_milestones || []) {
          map[`${domain.section}::${domain.domain_name}::${m.text}`] = {
            id: m.id,
            domain_id: domain.id,
            is_custom: m.is_custom,
          }
        }
      }
      setMilestoneMap(map)

      if (!selectedMonth) { setLoading(false); return }

      const milestoneIds = Object.values(map).map((v) => v.id)
      if (milestoneIds.length === 0) { setRatings({}); setLoading(false); return }

      const { data: ratingRows } = await supabase
        .from('swimmer_milestone_ratings')
        .select('milestone_id, rating, is_na')
        .eq('swimmer_id', swimmerId)
        .eq('month_year', selectedMonth)
        .in('milestone_id', milestoneIds)

      const rMap = {}
      for (const r of ratingRows || []) {
        rMap[r.milestone_id] = { rating: r.rating, is_na: r.is_na }
      }
      setRatings(rMap)

      const { data: attRow } = await supabase
        .from('swimmer_attitude_ratings')
        .select('coach_rating, self_rating, notes')
        .eq('swimmer_id', swimmerId)
        .eq('month_year', selectedMonth)
        .maybeSingle()

      setAttitudeRating(attRow ?? null)
    } catch (err) {
      console.error('RubricProgressView load error', err)
    } finally {
      setLoading(false)
    }
  }, [squadSlug, swimmerId, selectedMonth])

  useEffect(() => { loadRatings() }, [loadRatings])

  function getMilestoneId(section, domain, text) {
    return milestoneMap[`${section}::${domain}::${text}`]?.id ?? null
  }

  if (!rubric) {
    return (
      <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
        No rubric is defined for this squad yet.
      </div>
    )
  }

  const avg = overallAverage(ratings)
  const hasAnyRatings = Object.keys(ratings).length > 0

  return (
    <div className="space-y-5">
      {/* Header: squad info + month selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{rubric.ageRange}</p>
          {avg && (
            <p className="text-xs font-semibold text-primary dark:text-primary-light mt-0.5">
              Overall average: {avg} / 4
            </p>
          )}
        </div>
        {availableMonths.length > 0 ? (
          <select
            value={selectedMonth ?? ''}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">No evaluations yet</span>
        )}
      </div>

      {loading && (
        <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">Loading…</div>
      )}

      {!loading && !hasAnyRatings && availableMonths.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No rubric evaluations recorded yet.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Coaches can add a monthly evaluation above.
          </p>
        </div>
      )}

      {!loading && selectedMonth && (
        <>
          {/* Skills */}
          <ReadOnlySection
            title="Skills"
            sectionKey="skills"
            domains={rubric.sections.skills}
            milestoneMap={milestoneMap}
            ratings={ratings}
            getMilestoneId={getMilestoneId}
          />

          {/* Habits */}
          <ReadOnlySection
            title="Habits"
            sectionKey="habits"
            domains={rubric.sections.habits}
            milestoneMap={milestoneMap}
            ratings={ratings}
            getMilestoneId={getMilestoneId}
          />

          {/* Attitude */}
          <AttitudeDisplay attitude={attitudeRating} />
        </>
      )}
    </div>
  )
}

function ReadOnlySection({ title, sectionKey, domains, milestoneMap, ratings, getMilestoneId }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h4>
      {domains.map((domainObj) => {
        // Standard milestones
        const allMilestones = [...domainObj.milestones]

        // Custom milestones for this domain
        const customOnes = Object.entries(milestoneMap)
          .filter(([k, v]) => k.startsWith(`${sectionKey}::${domainObj.domain}::`) && v.is_custom)
          .map(([k]) => k.split('::')[2])
        allMilestones.push(...customOnes)

        const rated = allMilestones.filter((m) => {
          const id = getMilestoneId(sectionKey, domainObj.domain, m)
          const r = id ? ratings[id] : null
          return r && (r.rating != null || r.is_na)
        }).length

        return (
          <div key={domainObj.domain} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{domainObj.domain}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{rated}/{allMilestones.length} rated</span>
            </div>
            <div className="space-y-2">
              {allMilestones.map((milestoneText) => {
                const mid = getMilestoneId(sectionKey, domainObj.domain, milestoneText)
                const cur = mid ? ratings[mid] : null
                const badge = ratingBadge(cur?.rating ?? null, cur?.is_na ?? false)
                const isCustom = milestoneMap[`${sectionKey}::${domainObj.domain}::${milestoneText}`]?.is_custom
                return (
                  <div key={milestoneText} className="flex items-center gap-2">
                    <span className={`flex-1 text-sm leading-snug ${badge.strike ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} ${isCustom ? 'italic' : ''}`}>
                      {milestoneText}
                      {isCustom && <span className="ml-1 text-xs text-gray-400">(custom)</span>}
                    </span>
                    <span className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-7 rounded-lg text-xs font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AttitudeDisplay({ attitude }) {
  if (!attitude) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">Attitude</h4>
        <p className="text-sm text-gray-400 dark:text-gray-500">Not recorded for this month.</p>
      </div>
    )
  }

  const divergence = attitude.coach_rating != null && attitude.self_rating != null
    ? Math.abs(attitude.coach_rating - attitude.self_rating)
    : 0

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Attitude</h4>

      <div className="flex flex-wrap gap-4">
        <AttitudePill label="Coach observation" rating={attitude.coach_rating} />
        <AttitudePill label="Swimmer self-report" rating={attitude.self_rating} />
      </div>

      {divergence >= 2 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Divergence of {divergence} between coach and swimmer — worth a conversation.
        </div>
      )}

      {attitude.notes && (
        <p className="text-sm text-gray-600 dark:text-gray-400 italic">{attitude.notes}</p>
      )}
    </div>
  )
}

function AttitudePill({ label, rating }) {
  const colours = [
    '',
    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  ]

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {rating != null ? (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colours[rating]}`}>
          <span className="font-bold">{rating}</span>
          <span>{ATTITUDE_LABELS[rating]}</span>
        </span>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">Not recorded</span>
      )}
    </div>
  )
}
