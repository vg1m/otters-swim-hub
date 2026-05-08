'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RUBRIC_DATA, ATTITUDE_LABELS, hasRubric } from '@/lib/rubrics/rubric-data'
import toast from 'react-hot-toast'

const RATING_OPTIONS = [
  { value: 1, label: '1', title: 'Not yet introduced' },
  { value: 2, label: '2', title: 'Learning' },
  { value: 3, label: '3', title: 'Consistent' },
  { value: 4, label: '4', title: 'Mastered' },
]

const ATTITUDE_OPTIONS = [1, 2, 3, 4, 5]

/** Returns the first-of-month DATE string for a given year+month. */
function toMonthDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/** Computes domain average (1–4), ignoring N/A and unrated milestones. */
function domainAverage(milestones, ratings) {
  const scored = milestones
    .map((_, i) => ratings[i])
    .filter((r) => r && !r.is_na && r.rating != null)
    .map((r) => r.rating)
  if (scored.length === 0) return null
  return (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1)
}

/** Colour class for a numeric 1–4 average. */
function avgColour(avg) {
  if (avg === null) return 'text-gray-400 dark:text-gray-500'
  if (avg >= 3.5) return 'text-green-600 dark:text-green-400'
  if (avg >= 2.5) return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-600 dark:text-amber-400'
}

export default function RubricEvaluationPanel({ swimmerId, squadSlug, onSaved }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [milestoneMap, setMilestoneMap] = useState({})  // milestoneText → { id, domain_id }
  const [ratings, setRatings] = useState({})             // milestoneId → { rating, is_na }
  const [attitudeRating, setAttitudeRating] = useState({ coach_rating: null, self_rating: null, notes: '' })
  const [saving, setSaving] = useState(false)
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [customInputs, setCustomInputs] = useState({})   // domainId → text being typed
  const [addingCustom, setAddingCustom] = useState({})   // domainId → bool

  const rubric = RUBRIC_DATA[squadSlug]
  const monthDate = toMonthDate(year, month)

  // Load DB milestone IDs and existing ratings for the selected month
  const loadRatings = useCallback(async () => {
    if (!squadSlug || !hasRubric(squadSlug)) return
    setLoadingRatings(true)
    const supabase = createClient()

    try {
      // Load all milestone IDs for this squad (including custom)
      const { data: domains, error: dErr } = await supabase
        .from('rubric_domains')
        .select('id, domain_name, section, rubric_milestones(id, text, sort_order, is_custom)')
        .eq('squad_slug', squadSlug)
        .order('sort_order')

      if (dErr) throw dErr

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

      // Load existing ratings for this swimmer + month
      const milestoneIds = Object.values(map).map((v) => v.id)
      if (milestoneIds.length === 0) {
        setRatings({})
        return
      }

      const { data: ratingRows, error: rErr } = await supabase
        .from('swimmer_milestone_ratings')
        .select('milestone_id, rating, is_na')
        .eq('swimmer_id', swimmerId)
        .eq('month_year', monthDate)
        .in('milestone_id', milestoneIds)

      if (rErr) throw rErr

      const rMap = {}
      for (const r of ratingRows || []) {
        rMap[r.milestone_id] = { rating: r.rating, is_na: r.is_na }
      }
      setRatings(rMap)

      // Load attitude rating
      const { data: attRow } = await supabase
        .from('swimmer_attitude_ratings')
        .select('coach_rating, self_rating, notes')
        .eq('swimmer_id', swimmerId)
        .eq('month_year', monthDate)
        .maybeSingle()

      setAttitudeRating({
        coach_rating: attRow?.coach_rating ?? null,
        self_rating: attRow?.self_rating ?? null,
        notes: attRow?.notes ?? '',
      })
    } catch (err) {
      toast.error('Could not load existing ratings')
      console.error(err)
    } finally {
      setLoadingRatings(false)
    }
  }, [squadSlug, swimmerId, monthDate])

  useEffect(() => { loadRatings() }, [loadRatings])

  function getMilestoneId(section, domain, milestoneText) {
    return milestoneMap[`${section}::${domain}::${milestoneText}`]?.id ?? null
  }

  function setMilestoneRating(milestoneId, value) {
    if (!milestoneId) return
    setRatings((prev) => ({
      ...prev,
      [milestoneId]: { rating: value, is_na: false },
    }))
  }

  function toggleNA(milestoneId) {
    if (!milestoneId) return
    setRatings((prev) => {
      const cur = prev[milestoneId]
      return {
        ...prev,
        [milestoneId]: { rating: null, is_na: !(cur?.is_na) },
      }
    })
  }

  async function addCustomMilestone(domainId, sectionKey, domainName) {
    const text = (customInputs[domainId] || '').trim()
    if (!text) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('rubric_milestones')
      .insert({ domain_id: domainId, text, is_custom: true })
      .select('id, text')
      .single()
    if (error) { toast.error('Could not add milestone'); return }
    setMilestoneMap((prev) => ({
      ...prev,
      [`${sectionKey}::${domainName}::${text}`]: { id: data.id, domain_id: domainId, is_custom: true },
    }))
    setCustomInputs((prev) => ({ ...prev, [domainId]: '' }))
    setAddingCustom((prev) => ({ ...prev, [domainId]: false }))
    toast.success('Custom milestone added')
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      // Build upsert rows for milestone ratings
      const upsertRows = Object.entries(ratings).map(([milestoneId, r]) => ({
        swimmer_id: swimmerId,
        milestone_id: milestoneId,
        month_year: monthDate,
        rating: r.is_na ? null : r.rating,
        is_na: r.is_na,
        rated_by: user?.id ?? null,
      }))

      let wroteMilestones = false
      if (upsertRows.length > 0) {
        const { error } = await supabase
          .from('swimmer_milestone_ratings')
          .upsert(upsertRows, { onConflict: 'swimmer_id,milestone_id,month_year' })
        if (error) throw error
        wroteMilestones = true
      }

      // Upsert attitude rating
      let wroteAttitude = false
      if (attitudeRating.coach_rating != null || attitudeRating.self_rating != null) {
        const { error: aErr } = await supabase
          .from('swimmer_attitude_ratings')
          .upsert({
            swimmer_id: swimmerId,
            month_year: monthDate,
            coach_rating: attitudeRating.coach_rating,
            self_rating: attitudeRating.self_rating,
            notes: attitudeRating.notes || null,
            rated_by: user?.id ?? null,
          }, { onConflict: 'swimmer_id,month_year' })
        if (aErr) throw aErr
        wroteAttitude = true
      }

      toast.success('Rubric saved')
      if ((wroteMilestones || wroteAttitude) && typeof onSaved === 'function') {
        onSaved({ monthYear: monthDate })
      }
    } catch (err) {
      toast.error('Save failed — check your connection')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!rubric) return null

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-6">
      {/* Month picker */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Evaluating for:</span>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {loadingRatings && (
          <span className="text-xs text-gray-400 dark:text-gray-500">Loading…</span>
        )}
      </div>

      {/* Rating legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {RATING_OPTIONS.map((o) => (
          <span key={o.value} className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300">{o.value}</span>
            {o.title}
          </span>
        ))}
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center justify-center px-1.5 h-5 rounded bg-gray-100 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300 text-xs">N/A</span>
          Not applicable
        </span>
      </div>

      {/* Skills section */}
      <SectionBlock
        sectionKey="skills"
        title="Skills"
        domains={rubric.sections.skills}
        milestoneMap={milestoneMap}
        ratings={ratings}
        onRate={setMilestoneRating}
        onToggleNA={toggleNA}
        addingCustom={addingCustom}
        setAddingCustom={setAddingCustom}
        customInputs={customInputs}
        setCustomInputs={setCustomInputs}
        onAddCustom={addCustomMilestone}
        getMilestoneId={getMilestoneId}
      />

      {/* Habits section */}
      <SectionBlock
        sectionKey="habits"
        title="Habits"
        domains={rubric.sections.habits}
        milestoneMap={milestoneMap}
        ratings={ratings}
        onRate={setMilestoneRating}
        onToggleNA={toggleNA}
        addingCustom={addingCustom}
        setAddingCustom={setAddingCustom}
        customInputs={customInputs}
        setCustomInputs={setCustomInputs}
        onAddCustom={addCustomMilestone}
        getMilestoneId={getMilestoneId}
      />

      {/* Attitude section */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Attitude</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Rated on a 1–5 scale. Coach observation and swimmer self-report captured separately.
          Divergence is useful signal.
        </p>

        <AttitudeRow
          label="Coach observation"
          value={attitudeRating.coach_rating}
          onChange={(v) => setAttitudeRating((prev) => ({ ...prev, coach_rating: v }))}
        />
        <AttitudeRow
          label="Swimmer self-report"
          value={attitudeRating.self_rating}
          onChange={(v) => setAttitudeRating((prev) => ({ ...prev, self_rating: v }))}
        />

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Attitude notes (optional)
          </label>
          <textarea
            rows={2}
            value={attitudeRating.notes}
            onChange={(e) => setAttitudeRating((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Any context on attitude divergence or notable observations…"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving…' : 'Save evaluation'}
        </button>
      </div>
    </div>
  )
}

function SectionBlock({
  sectionKey, title, domains, milestoneMap, ratings,
  onRate, onToggleNA, addingCustom, setAddingCustom,
  customInputs, setCustomInputs, onAddCustom, getMilestoneId,
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h4>
      {domains.map((domainObj) => {
        const domainKey = `${sectionKey}::${domainObj.domain}`
        const domainId = Object.values(milestoneMap).find(
          (v) => Object.keys(milestoneMap).some(
            (k) => k.startsWith(`${sectionKey}::${domainObj.domain}::`) && milestoneMap[k]?.domain_id === v.domain_id
          )
        )?.domain_id

        const domainMilestoneIds = domainObj.milestones.map((m) => getMilestoneId(sectionKey, domainObj.domain, m))
        const avg = domainAverage(domainObj.milestones, domainMilestoneIds.map((id) => id ? ratings[id] : null))

        // Custom milestones stored in milestoneMap for this domain
        const customMilestones = Object.entries(milestoneMap)
          .filter(([k, v]) => k.startsWith(`${sectionKey}::${domainObj.domain}::`) && v.is_custom)
          .map(([k, v]) => ({ text: k.split('::')[2], id: v.id }))

        return (
          <div key={domainKey} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{domainObj.domain}</span>
              {avg !== null && (
                <span className={`text-xs font-bold ${avgColour(avg)}`}>avg {avg}</span>
              )}
            </div>

            <div className="space-y-2.5">
              {domainObj.milestones.map((milestoneText) => {
                const mid = getMilestoneId(sectionKey, domainObj.domain, milestoneText)
                const cur = mid ? ratings[mid] : null
                return (
                  <MilestoneRow
                    key={milestoneText}
                    text={milestoneText}
                    milestoneId={mid}
                    current={cur}
                    onRate={onRate}
                    onToggleNA={onToggleNA}
                  />
                )
              })}

              {/* Custom milestones */}
              {customMilestones.map(({ text, id }) => {
                const cur = ratings[id]
                return (
                  <MilestoneRow
                    key={id}
                    text={text}
                    milestoneId={id}
                    current={cur}
                    onRate={onRate}
                    onToggleNA={onToggleNA}
                    isCustom
                  />
                )
              })}

              {/* Add custom milestone */}
              {domainId && (
                addingCustom[domainId] ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customInputs[domainId] || ''}
                      onChange={(e) => setCustomInputs((prev) => ({ ...prev, [domainId]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onAddCustom(domainId, sectionKey, domainObj.domain)
                        if (e.key === 'Escape') setAddingCustom((prev) => ({ ...prev, [domainId]: false }))
                      }}
                      placeholder="New milestone text…"
                      autoFocus
                      className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={() => onAddCustom(domainId, sectionKey, domainObj.domain)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingCustom((prev) => ({ ...prev, [domainId]: false }))}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCustom((prev) => ({ ...prev, [domainId]: true }))}
                    className="mt-1 text-xs text-primary dark:text-primary-light hover:underline"
                  >
                    + Add custom milestone
                  </button>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MilestoneRow({ text, milestoneId, current, onRate, onToggleNA, isCustom }) {
  const isNA = current?.is_na
  const activeRating = isNA ? null : (current?.rating ?? null)

  const ratingColours = {
    1: { active: 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-700 dark:text-red-300', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-300' },
    2: { active: 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-300' },
    3: { active: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300' },
    4: { active: 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-700 dark:text-green-300', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-300' },
  }

  return (
    <div className={`flex items-start gap-2 ${isNA ? 'opacity-60' : ''}`}>
      <span className={`flex-1 text-sm leading-snug pt-0.5 ${isNA ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} ${isCustom ? 'italic' : ''}`}>
        {text}
        {isCustom && <span className="ml-1 text-xs text-gray-400">(custom)</span>}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        {RATING_OPTIONS.map((o) => {
          const isActive = activeRating === o.value
          const c = ratingColours[o.value]
          return (
            <button
              key={o.value}
              onClick={() => milestoneId && onRate(milestoneId, isActive ? null : o.value)}
              title={o.title}
              disabled={isNA}
              className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all disabled:cursor-not-allowed ${isActive ? c.active : c.inactive}`}
            >
              {o.label}
            </button>
          )
        })}
        <button
          onClick={() => milestoneId && onToggleNA(milestoneId)}
          title="Not applicable"
          className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${isNA ? 'bg-gray-200 dark:bg-gray-600 border-gray-400 dark:border-gray-400 text-gray-700 dark:text-gray-200' : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-400'}`}
        >
          N/A
        </button>
      </div>
    </div>
  )
}

function AttitudeRow({ label, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300 w-40 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {ATTITUDE_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => onChange(value === v ? null : v)}
            title={ATTITUDE_LABELS[v]}
            className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all ${
              value === v
                ? 'bg-primary border-primary text-white'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary/50'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {value && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{ATTITUDE_LABELS[value]}</span>
      )}
    </div>
  )
}
