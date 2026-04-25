'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { format, subDays } from 'date-fns'
import { formatDate, formatSessionTime } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

/** Preset button labels (full text, compact typography on buttons). */
const RANGE = {
  7: 'Last 7 days',
  30: 'Last 30 days',
  90: 'Last 90 days',
}

/** Stable map key for profile UUIDs (avoids miss when casing/format differs). */
function normId(id) {
  if (id == null) return ''
  return String(id).trim().toLowerCase()
}

function parsePerSessionRateKes(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && !Number.isNaN(raw) && raw > 0) return raw
  const n = Number(String(raw).replace(/,/g, '').trim())
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

/** Who marked swimmers in as coach — mode of coach_id on those rows (same as payroll). */
function pickPayrollCoachIdFromAttendance(rows) {
  if (!rows?.length) return null
  const coachRows = rows.filter((r) => r.checked_in_by === 'coach' && r.coach_id)
  if (coachRows.length === 0) return null
  const counts = new Map()
  for (const r of coachRows) {
    const nk = normId(r.coach_id)
    counts.set(nk, (counts.get(nk) || 0) + 1)
  }
  let bestK = null
  let bestN = 0
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n
      bestK = k
    }
  }
  const first = coachRows.find((r) => normId(r.coach_id) === bestK)
  return first ? String(first.coach_id).trim() : null
}

/**
 * @param {Array<{ id: string, full_name?: string, per_session_rate_kes?: unknown }>} coaches – from Coach Management: filter dropdown + fallback for per-session rate when the batch profile query is missing a row.
 */
export default function CoachDeliveryReviewPanel({ coaches = [] }) {
  const { user, profile } = useAuth()
  const [coachId, setCoachId] = useState('')
  const [rangeDays, setRangeDays] = useState(30)
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [attendanceBySession, setAttendanceBySession] = useState({})
  const [payBySession, setPayBySession] = useState({})
  const [reviewBySession, setReviewBySession] = useState({})
  const [reviewerNames, setReviewerNames] = useState({})
  const [modalSession, setModalSession] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [payLineSession, setPayLineSession] = useState(null)
  /** KES from coach’s profile (per_session_rate_kes) — used when recording a line; no manual entry. */
  const [payLineResolvedKes, setPayLineResolvedKes] = useState(null)
  const [payLineSaving, setPayLineSaving] = useState(false)
  const [payLineRateLoading, setPayLineRateLoading] = useState(false)
  /** Lead coach id from DB when modal opens (authoritative; client session row can be wrong/stale). */
  const [payLineLeadCoachId, setPayLineLeadCoachId] = useState(null)
  /** full_name from profiles row (may be set when Roster list doesn’t include this coach). */
  const [payLineLeadCoachName, setPayLineLeadCoachName] = useState(null)
  const payLineFetchTokenRef = useRef(0)
  /**
   * Session id → profile id of the coach who used coach check-in (mode over attendance rows).
   * If absent, UI and pay line fall back to training_sessions.coach_id.
   */
  const [payrollCoachBySession, setPayrollCoachBySession] = useState({})
  /** normId → { full_name, per_session_rate_kes } for loaded coaches. */
  const [coachProfileById, setCoachProfileById] = useState({})
  /** per_session_rate_kes by normId (mirrors batch profile fetch for quick lookups). */
  const [coachRateByCoachId, setCoachRateByCoachId] = useState({})

  const applyPreset = (days) => {
    setRangeDays(days)
    setDateTo(format(new Date(), 'yyyy-MM-dd'))
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
  }

  const loadData = useCallback(async () => {
    if (profile?.role !== 'admin' || !user) return
    setLoading(true)
    const supabase = createClient()
    const from = dateFrom
    const to = dateTo
    if (!from || !to || from > to) {
      toast.error('Invalid date range')
      setLoading(false)
      return
    }
    if ((new Date(to) - new Date(from)) / (864e5) > 120) {
      toast.error('Range too large (max 120 days). Narrow the dates.')
      setLoading(false)
      return
    }

    try {
      let q = supabase
        .from('training_sessions')
        .select('id, session_date, start_time, end_time, pool_location, facility_id, coach_id, facilities(name)')
        .gte('session_date', from)
        .lte('session_date', to)
        .not('coach_id', 'is', null)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false })
      if (coachId) {
        q = q.eq('coach_id', coachId)
      }
      const { data: sessionRows, error: sessErr } = await q
      if (sessErr) throw sessErr
      const list = sessionRows || []

      if (list.length === 0) {
        setSessions([])
        setAttendanceBySession({})
        setPayBySession({})
        setReviewBySession({})
        setReviewerNames({})
        setCoachRateByCoachId({})
        setPayrollCoachBySession({})
        setCoachProfileById({})
        return
      }

      const ids = list.map((s) => s.id)

      const [attRes, payRes, revRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('session_id, swimmer_id, coach_id, checked_in_by, swimmers(first_name, last_name)')
          .in('session_id', ids),
        supabase
          .from('coach_session_pay_events')
          .select('id, session_id, amount_kes, rate_snapshot_kes, created_at')
          .in('session_id', ids),
        supabase
          .from('coach_session_delivery_reviews')
          .select('session_id, coach_id, reviewed_at, reviewed_by, notes')
          .in('session_id', ids),
      ])
      if (attRes.error) throw attRes.error
      if (payRes.error) throw payRes.error
      if (revRes.error) throw revRes.error

      const rawBySession = {}
      for (const row of attRes.data || []) {
        if (!rawBySession[row.session_id]) rawBySession[row.session_id] = []
        rawBySession[row.session_id].push(row)
      }
      const payrollMap = {}
      for (const sid of ids) {
        const picked = pickPayrollCoachIdFromAttendance(rawBySession[sid])
        if (picked) payrollMap[sid] = picked
      }
      setPayrollCoachBySession(payrollMap)

      const idSet = new Set()
      for (const s of list) {
        if (s.coach_id) idSet.add(String(s.coach_id).trim())
      }
      for (const pid of Object.values(payrollMap)) {
        if (pid) idSet.add(String(pid).trim())
      }
      const profIds = [...idSet]
      const profMap = {}
      const rateById = {}
      if (profIds.length > 0) {
        const { data: profRows, error: profBatchErr } = await supabase
          .from('profiles')
          .select('id, full_name, per_session_rate_kes')
          .in('id', profIds)
        if (profBatchErr) throw profBatchErr
        for (const row of profRows || []) {
          const k = normId(row.id)
          if (!k) continue
          profMap[k] = { full_name: row.full_name, per_session_rate_kes: row.per_session_rate_kes }
          rateById[k] = row.per_session_rate_kes
        }
      }
      setCoachProfileById(profMap)
      setCoachRateByCoachId(rateById)
      setSessions(list)

      const attMap = {}
      for (const row of attRes.data || []) {
        if (!attMap[row.session_id]) attMap[row.session_id] = []
        const sn = row.swimmers
        const name = sn
          ? `${sn.first_name || ''} ${sn.last_name || ''}`.trim()
          : 'Unknown swimmer'
        attMap[row.session_id].push({ swimmer_id: row.swimmer_id, name })
      }
      for (const id of ids) {
        if (!attMap[id]) attMap[id] = []
        attMap[id].sort((a, b) => a.name.localeCompare(b.name))
      }
      setAttendanceBySession(attMap)

      const payMap = {}
      for (const p of payRes.data || []) {
        payMap[p.session_id] = p
      }
      setPayBySession(payMap)

      const revMap = {}
      const reviewerIds = new Set()
      for (const r of revRes.data || []) {
        revMap[r.session_id] = r
        if (r.reviewed_by) reviewerIds.add(r.reviewed_by)
      }
      setReviewBySession(revMap)

      if (reviewerIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', [...reviewerIds])
        const nm = {}
        for (const p of profs || []) {
          nm[p.id] = p.full_name || p.id
        }
        setReviewerNames(nm)
      } else {
        setReviewerNames({})
      }
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to load service data')
    } finally {
      setLoading(false)
    }
  }, [user, profile?.role, dateFrom, dateTo, coachId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const summary = useMemo(() => {
    if (!sessions.length) {
      return { sessionCount: 0, dayCount: 0, checkInCount: 0, uniqueSwimmers: 0, coachCount: 0 }
    }
    const days = new Set(sessions.map((s) => s.session_date).filter(Boolean))
    let checkInCount = 0
    const swimmers = new Set()
    const coachIds = new Set()
    for (const s of sessions) {
      const effective = payrollCoachBySession[s.id] ?? s.coach_id
      if (effective != null && String(effective).trim() !== '') {
        coachIds.add(normId(effective))
      }
      const rows = attendanceBySession[s.id] || []
      checkInCount += rows.length
      for (const r of rows) {
        if (r.swimmer_id) swimmers.add(r.swimmer_id)
      }
    }
    return {
      sessionCount: sessions.length,
      dayCount: days.size,
      checkInCount,
      uniqueSwimmers: swimmers.size,
      coachCount: coachIds.size,
    }
  }, [sessions, attendanceBySession, payrollCoachBySession])

  const coachName = useCallback(
    (id) => {
      if (id == null || id === '') return 'N/A'
      const k = normId(id)
      const c = coaches.find((x) => normId(x.id) === k)
      return c?.full_name || 'Coach'
    },
    [coaches]
  )

  /** Name for card / pay line: coach who used coach check-in when present, else lead on the session. */
  const displayCoachNameForSession = useCallback(
    (session) => {
      const effective = payrollCoachBySession[session.id] ?? session.coach_id
      if (effective == null || effective === '') return 'N/A'
      const k = normId(effective)
      const n = coachProfileById[k]?.full_name?.trim()
      if (n) return n
      return coachName(effective)
    },
    [payrollCoachBySession, coachProfileById, coachName]
  )

  async function saveReview() {
    if (!modalSession || !user) return
    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('coach_session_delivery_reviews').upsert(
        {
          session_id: modalSession.id,
          coach_id: modalSession.coach_id,
          reviewed_by: user.id,
          notes: reviewNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      )
      if (error) throw error
      toast.success('Review saved')
      setModalSession(null)
      setReviewNotes('')
      await loadData()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to save review')
    } finally {
      setSaving(false)
    }
  }

  async function clearReview(sessionId) {
    if (!confirm('Remove this sign-off?')) return
    const supabase = createClient()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('coach_session_delivery_reviews')
        .delete()
        .eq('session_id', sessionId)
      if (error) throw error
      toast.success('Sign-off removed')
      await loadData()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  function openReviewModal(session) {
    const existing = reviewBySession[session.id]
    setReviewNotes(existing?.notes || '')
    setModalSession(session)
  }

  /** Per-session KES: batch profile map, in-memory map, then roster (coaches prop). */
  function resolvedRateKesForCoach(coachId) {
    if (!coachId) return null
    const k = normId(coachId)
    const fromProfile = parsePerSessionRateKes(coachProfileById[k]?.per_session_rate_kes)
    if (fromProfile != null) return fromProfile
    const fromMap = coachRateByCoachId[k] ?? coachRateByCoachId[String(coachId).trim()]
    let n = parsePerSessionRateKes(fromMap)
    if (n != null) return n
    const c = coaches.find((x) => normId(x.id) === k)
    return parsePerSessionRateKes(c?.per_session_rate_kes)
  }

  async function openPayLineModal(session) {
    const token = (payLineFetchTokenRef.current += 1)
    setPayLineSession(session)
    setPayLineResolvedKes(null)
    setPayLineLeadCoachId(null)
    setPayLineLeadCoachName(null)
    setPayLineRateLoading(true)
    const supabase = createClient()
    const targetId = String(
      payrollCoachBySession[session.id] ?? session.coach_id ?? ''
    ).trim()
    if (!targetId) {
      if (token === payLineFetchTokenRef.current) {
        setPayLineRateLoading(false)
        setPayLineSession(null)
        toast.error(
          'No coach to pay: record coach check-ins for this session, or assign a lead coach in Sessions.'
        )
      }
      return
    }
    setPayLineLeadCoachId(targetId)
    const cachedName = coachProfileById[normId(targetId)]?.full_name?.trim()
    if (cachedName) setPayLineLeadCoachName(cachedName)
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, per_session_rate_kes, full_name')
        .eq('id', targetId)
        .maybeSingle()
      if (token !== payLineFetchTokenRef.current) return
      if (profErr) {
        console.warn('Profile per-session rate load:', profErr)
        setPayLineResolvedKes(resolvedRateKesForCoach(targetId))
        return
      }
      if (!prof) {
        setPayLineResolvedKes(resolvedRateKesForCoach(targetId))
        return
      }
      if (prof.full_name?.trim()) {
        setPayLineLeadCoachName(prof.full_name.trim())
      }
      let n = parsePerSessionRateKes(prof.per_session_rate_kes)
      if (n == null) {
        n = resolvedRateKesForCoach(targetId)
      }
      setPayLineResolvedKes(n)
    } finally {
      if (token === payLineFetchTokenRef.current) {
        setPayLineRateLoading(false)
      }
    }
  }

  function effectivePayLineCoachId() {
    if (!payLineSession) return null
    if (payLineLeadCoachId) return payLineLeadCoachId
    const fromAtt = payrollCoachBySession[payLineSession.id]
    if (fromAtt) return fromAtt
    const id = payLineSession.coach_id
    return id == null || id === '' ? null : String(id).trim()
  }

  async function savePayLine() {
    if (!payLineSession || !user) return
    const leadCoachId = effectivePayLineCoachId()
    if (!leadCoachId) {
      toast.error(
        'No coach to pay. Record coach check-ins, or ensure this session has a lead coach in Sessions.'
      )
      return
    }
    let n = payLineResolvedKes
    if (n == null || n <= 0) {
      n = resolvedRateKesForCoach(leadCoachId)
    }
    if (n == null || n <= 0) {
      toast.error('Set a per-session amount for this coach in Coach Management (roster) first.')
      return
    }
    setPayLineSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('coach_session_pay_events').insert({
        session_id: payLineSession.id,
        coach_id: leadCoachId,
        amount_kes: n,
        rate_snapshot_kes: n,
      })
      if (error) {
        if (error.code === '23505' || /duplicate key|unique constraint/i.test(String(error.message || ''))) {
          throw new Error('A pay line for this session already exists. Refresh the page.')
        }
        throw error
      }
      toast.success('Pay line recorded')
      payLineFetchTokenRef.current += 1
      setPayLineSession(null)
      setPayLineResolvedKes(null)
      setPayLineLeadCoachId(null)
      setPayLineLeadCoachName(null)
      setPayLineRateLoading(false)
      await loadData()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to record pay line')
    } finally {
      setPayLineSaving(false)
    }
  }

  const coachOptions = useMemo(
    () => [
      { value: '', label: 'All coaches' },
      ...coaches.map((c) => ({ value: c.id, label: c.full_name || c.email || c.id })),
    ],
    [coaches]
  )

  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 px-2 py-3 sm:px-3"
        role="status"
        aria-label="Range summary"
      >
        <div className="grid min-h-0 grid-cols-3 [grid-template-rows:minmax(0,1fr)_auto_minmax(0,1fr)] text-center sm:min-h-[6.5rem]">
          <div className="col-start-1 row-start-1 flex flex-col items-center justify-end gap-0.5 pb-1 sm:justify-center sm:pb-0">
            <p className="text-lg font-bold text-primary tabular-nums leading-none sm:text-base">
              {summary.sessionCount}
            </p>
            <p className="text-[9px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[10px]">Sessions</p>
          </div>
          <div className="col-start-3 row-start-1 flex flex-col items-center justify-end gap-0.5 pb-1 sm:justify-center sm:pb-0">
            <p className="text-lg font-bold text-primary tabular-nums leading-none sm:text-base">
              {summary.dayCount}
            </p>
            <p className="text-[9px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[10px]">Calendar days</p>
          </div>
          <div
            className="col-start-2 row-start-2 flex min-w-0 flex-col items-center justify-center self-center justify-self-center rounded-xl border-2 border-primary/35 bg-primary/10 px-1.5 py-2.5 text-center shadow-sm dark:border-primary/40 dark:bg-primary/15"
            title="Coaches: distinct in this range (attendance coach when set, else session lead per session)"
          >
            <p className="text-2xl font-extrabold leading-none text-primary tabular-nums sm:text-3xl">
              {summary.coachCount}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold leading-tight text-primary sm:text-[10px]">Coaches</p>
          </div>
          <div className="col-start-1 row-start-3 flex flex-col items-center justify-start gap-0.5 pt-1 sm:justify-center sm:pt-0">
            <p className="text-lg font-bold text-primary tabular-nums leading-none sm:text-base">
              {summary.checkInCount}
            </p>
            <p className="text-[9px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[10px]">Check-ins</p>
          </div>
          <div className="col-start-3 row-start-3 flex flex-col items-center justify-start gap-0.5 pt-1 sm:justify-center sm:pt-0">
            <p className="text-lg font-bold text-primary tabular-nums leading-none sm:text-base">
              {summary.uniqueSwimmers}
            </p>
            <p className="text-[9px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[10px]">Unique swimmers</p>
          </div>
        </div>
      </div>

      <Card
        padding="normal"
        className="!p-3 sm:!p-4 [&_label]:mb-0.5 [&_label]:text-[10px] [&_label]:font-medium [&_label]:text-gray-500 dark:[&_label]:text-gray-400 [&_input]:!py-1.5 [&_input]:!text-xs [&_select]:!py-1.5 [&_select]:!text-xs"
      >
        <p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400 sm:text-[11px]">
          Filter by coach and dates, then review sessions below.
        </p>
        <div className="mt-2 space-y-2.5 sm:space-y-3">
          <Select
            label="Coach"
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
            options={coachOptions}
          />
          <div>
            <span className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Date range</span>
            <div className="flex flex-row flex-wrap items-end gap-2 sm:gap-3">
              <div className="min-w-0 flex-1 sm:flex-initial sm:w-[10.5rem]">
                <Input
                  label="From"
                  type="date"
                  value={dateFrom}
                  className="!text-xs"
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setRangeDays(0)
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 sm:flex-initial sm:w-[10.5rem]">
                <Input
                  label="To"
                  type="date"
                  value={dateTo}
                  className="!text-xs"
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setRangeDays(0)
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-7 w-auto shrink-0 self-end !min-h-0 !px-2.5 !py-0 !text-[10px] !leading-tight sm:mb-0.5"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </Button>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Presets</span>
            <div className="flex w-full max-w-full flex-wrap items-stretch justify-start gap-1.5">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={rangeDays === d ? 'primary' : 'secondary'}
                  className="!h-auto !min-h-0 shrink-0 !px-2 !py-1 !text-[9px] !leading-tight sm:!px-2.5 sm:!text-[10px]"
                  onClick={() => applyPreset(d)}
                >
                  {RANGE[d]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {sessions.length === 0 ? (
        <Card padding="normal" className="!p-3">
          <p className="text-center text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            No sessions in this range with a coach assigned. Widen the dates or create sessions with a coach.
          </p>
        </Card>
      ) : (
        <ul className="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
          {sessions.map((session) => {
            const swimmers = attendanceBySession[session.id] || []
            const pay = payBySession[session.id]
            const rev = reviewBySession[session.id]
            const location =
              session.facilities?.name || session.pool_location || 'N/A'
            const st = formatSessionTime(session.start_time) || String(session.start_time || '')
            const en = formatSessionTime(session.end_time) || String(session.end_time || '')
            return (
              <li key={session.id} className="min-w-0">
                <Card
                  padding="normal"
                  className="border border-gray-200 !p-3 dark:border-gray-700 sm:!p-4"
                >
                  <div className="flex flex-col gap-2 border-b border-gray-100 pb-2.5 dark:border-gray-700/80 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:pb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                        {formatDate(session.session_date)} · {st} – {en}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{location}</p>
                      <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-500">Coach</span>{' '}
                        {displayCoachNameForSession(session)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                      {pay ? (
                        <Badge variant="success" size="sm">
                          Paid · KES {Number(pay.amount_kes).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          No pay line
                        </Badge>
                      )}
                      {rev ? (
                        <Badge variant="info" size="sm">
                          Signed off
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Swimmers:{' '}
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {swimmers.length}
                      </span>{' '}
                      checked in
                    </p>
                    {swimmers.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">No check-ins yet.</p>
                    ) : (
                      <details className="group mt-1.5 rounded-md border border-gray-200/90 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800/40">
                        <summary className="min-h-11 list-none cursor-pointer px-2.5 py-2 text-xs font-medium text-primary dark:text-primary-light [&::-webkit-details-marker]:hidden sm:min-h-0 sm:px-3 sm:py-1.5">
                          View names
                        </summary>
                        <ul className="m-0 list-disc space-y-0.5 border-t border-gray-200/80 px-2.5 py-2 pl-5 text-xs text-gray-800 dark:text-gray-200 break-words dark:border-gray-600 sm:px-3 sm:pl-5">
                          {swimmers.map((r) => (
                            <li key={r.swimmer_id}>{r.name}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {rev && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Sign-off</span>{' '}
                      {rev.reviewed_at ? formatDate(rev.reviewed_at.split('T')[0]) : 'N/A'}
                      {rev.reviewed_by
                        ? ` · ${reviewerNames[rev.reviewed_by] || 'Admin'}`
                        : ''}
                      {rev.notes ? ` · ${rev.notes}` : ''}
                    </p>
                  )}

                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:flex sm:flex-wrap sm:gap-2">
                    <Link
                      href={`/admin/sessions/${session.id}/attendance`}
                      className="min-w-0 sm:min-w-0 sm:shrink-0"
                    >
                      <Button size="sm" variant="secondary" type="button" className="w-full sm:w-auto">
                        Attendance
                      </Button>
                    </Link>
                    {!pay && (payrollCoachBySession[session.id] || session.coach_id) ? (
                      <Button
                        size="sm"
                        variant="primary"
                        type="button"
                        className="w-full min-w-0 sm:w-auto"
                        disabled={payLineSaving}
                        onClick={() => openPayLineModal(session)}
                      >
                        Pay line
                      </Button>
                    ) : null}
                    {rev ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          className="w-full min-w-0 sm:w-auto"
                          onClick={() => openReviewModal(session)}
                        >
                          Edit sign-off
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          type="button"
                          className="w-full min-w-0 sm:w-auto"
                          disabled={saving}
                          onClick={() => clearReview(session.id)}
                        >
                          Remove sign-off
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        type="button"
                        className="w-full min-w-0 sm:w-auto"
                        onClick={() => openReviewModal(session)}
                      >
                        Mark reviewed
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        isOpen={!!modalSession}
        onClose={() => {
          setModalSession(null)
          setReviewNotes('')
        }}
        title="Service delivery sign-off"
        size="md"
        footer={
          <div className="flex w-full flex-row justify-end gap-2 sm:gap-3">
            <Button
              variant="secondary"
              className="min-h-11 min-w-0 flex-1 sm:min-h-0 sm:w-auto sm:flex-initial"
              onClick={() => setModalSession(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11 min-w-0 flex-1 sm:min-h-0 sm:w-auto sm:flex-initial"
              onClick={saveReview}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        }
      >
        {modalSession && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(modalSession.session_date)} · {coachName(modalSession.coach_id)}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Confirmed with pool log"
                rows={3}
                className="appearance-none block w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!payLineSession}
        onClose={() => {
          if (payLineSaving) return
          payLineFetchTokenRef.current += 1
          setPayLineSession(null)
          setPayLineResolvedKes(null)
          setPayLineLeadCoachId(null)
          setPayLineLeadCoachName(null)
          setPayLineRateLoading(false)
        }}
        title="Record pay line"
        size="md"
        footer={
          <div className="flex w-full flex-row items-center justify-end gap-2 sm:gap-3">
            <Button
              variant="secondary"
              className="min-h-11 min-w-0 flex-1 sm:min-h-0 sm:w-auto sm:flex-initial"
              onClick={() => {
                if (payLineSaving) return
                payLineFetchTokenRef.current += 1
                setPayLineSession(null)
                setPayLineResolvedKes(null)
                setPayLineLeadCoachId(null)
                setPayLineLeadCoachName(null)
                setPayLineRateLoading(false)
              }}
              disabled={payLineSaving}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11 min-w-0 flex-1 sm:min-h-0 sm:w-auto sm:flex-initial"
              onClick={savePayLine}
              loading={payLineSaving}
              disabled={
                payLineSaving ||
                payLineRateLoading ||
                payLineResolvedKes == null ||
                payLineResolvedKes <= 0
              }
            >
              Record pay
            </Button>
          </div>
        }
      >
        {payLineSession && (
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border border-gray-200/90 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800/50 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-3.5 sm:py-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Session</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(payLineSession.session_date)}
                </p>
              </div>
              <div className="mt-1.5 min-w-0 sm:mt-0 sm:text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Coach (pay to)</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                  {payLineLeadCoachName ||
                    coachProfileById[normId(payLineLeadCoachId || '')]?.full_name ||
                    coachName(
                      payLineLeadCoachId ||
                        payrollCoachBySession[payLineSession.id] ||
                        payLineSession.coach_id
                    )}
                </p>
              </div>
            </div>
            {payLineRateLoading ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-1">Loading rate…</p>
            ) : payLineResolvedKes != null && payLineResolvedKes > 0 ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 dark:border-primary/30 dark:bg-primary/10 sm:px-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Roster per-session amount</p>
                  <p className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">
                    KES{' '}
                    {payLineResolvedKes.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  From coach check-ins, or the session’s lead. Adjust in Roster if wrong.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-medium">Set a per-session rate for this coach</p>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-1">
                  Open Coach Management → their roster, set <strong>Per session (KES)</strong>, then refresh.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
