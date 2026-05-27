'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDate, formatDateTime, combineSessionDateAndTime } from '@/lib/utils/date-helpers'
import {
  buildRecurrencePattern,
  parseRecurrencePattern,
  formatRecurrencePattern,
  getWeekday,
  getOrdinalWeek,
  expandRecurringSessions,
} from '@/lib/utils/recurrence'
import toast from 'react-hot-toast'
import { dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import {
  adminCalendarFetchBounds,
  fetchSessionsForCalendarWindow,
  fetchSessionExceptionsForWindow,
} from '@/lib/sessions/calendar-window'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getSquadCalendarEventProps } from '@/lib/utils/squad-calendar'
import SessionFormFields from '@/components/admin/SessionFormFields'
import { requestSessionScheduleNotify } from '@/lib/sessions/request-session-schedule-notify'

/** One pill per squad colour family (calendar events still resolve slug → colour). */
const SQUAD_LEGEND_CHIPS = [
  { label: 'Elite', cls: 'rbc-squad-elite' },
  { label: 'Pups', cls: 'rbc-squad-pups' },
  { label: 'Development', cls: 'rbc-squad-development' },
  { label: 'Masters', cls: 'rbc-squad-masters' },
  { label: 'Other / unassigned', cls: 'rbc-squad-default' },
]

const Calendar = dynamic(
  () => import('react-big-calendar').then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Loading calendar…
      </div>
    ),
  }
)

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
})

const CALENDAR_VIEWS = ['month', 'week', 'day', 'agenda']

const VIEW_LABELS = { month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda' }

/** View-aware height: month/week/day get more vertical space than agenda; cap by viewport. */
function computeCalendarHeight(view, innerWidth, innerHeight) {
  const wide = innerWidth >= 768
  if (!wide) {
    if (view === 'agenda') {
      return Math.max(340, Math.round(Math.min(innerHeight * 0.52, 560)))
    }
    return Math.max(420, Math.round(Math.min(innerHeight * 0.75, 720)))
  }
  if (view === 'agenda') return 680
  if (view === 'month') return Math.min(Math.round(innerHeight * 0.88), 900)
  return Math.min(Math.round(innerHeight * 0.88), 880)
}

function SessionsCalendarToolbar({ label, onNavigate, onView, view }) {
  const segBtn =
    'min-h-[44px] flex-1 border-0 bg-transparent px-2 text-sm font-medium transition-colors focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 sm:min-h-[42px] sm:px-3'

  return (
    <div className="rbc-toolbar admin-rbc-toolbar flex w-full flex-col gap-4">
      <div className="rbc-toolbar-label px-1 text-center text-base font-semibold leading-snug text-gray-900 dark:text-gray-100 sm:text-lg">
        {label}
      </div>

      {/* Two equal-width segmented groups on md+; stacked on small screens */}
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div
          className="admin-rbc-segmented flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800"
          role="group"
          aria-label="Navigate calendar dates"
        >
          <button type="button" className={segBtn} onClick={() => onNavigate('PREV')}>
            Back
          </button>
          <button type="button" className={segBtn} onClick={() => onNavigate('TODAY')}>
            Today
          </button>
          <button type="button" className={segBtn} onClick={() => onNavigate('NEXT')}>
            Next
          </button>
        </div>

        <div
          className="admin-rbc-segmented flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800"
          role="group"
          aria-label="Calendar view mode"
        >
          {CALENDAR_VIEWS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              className={segBtn}
              onClick={() => onView(name)}
            >
              {VIEW_LABELS[name] ?? name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


export default function SessionsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState([])
  const [facilities, setFacilities] = useState([])
  const [squadList, setSquadList] = useState([])
  const [coachList, setCoachList] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [editingSession, setEditingSession] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showCustomPool, setShowCustomPool] = useState(false)
  const [customPoolName, setCustomPoolName] = useState('')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState('week')
  const [windowSize, setWindowSize] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [moreEvents, setMoreEvents] = useState(null)
  const [sessionExceptions, setSessionExceptions] = useState([])
  const [editScope, setEditScope] = useState(null)
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState(null)
  const [scopeChoice, setScopeChoice] = useState(null)

  const calendarHeight = useMemo(() => {
    if (!windowSize) return 680
    return computeCalendarHeight(calendarView, windowSize.w, windowSize.h)
  }, [calendarView, windowSize])
  
  const [sessionForm, setSessionForm] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
    squad_ids: [],
    pool_location: '',
    facility_id: '',
    coach_id: '',
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_weekday: '',
    recurrence_ordinal: '',
    recurrence_day_type: 'first',
    recurrence_annually_date: '',
    recurrence_custom_interval: '1',
    recurrence_custom_unit: 'week',
    recurrence_custom_weekdays: [],
    recurrence_end_date: '',
  })

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cachedProfile?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    
    // Load static lists once
    if (user) {
      loadFacilities()
      loadSquads()
      loadCoaches()
    }
  }, [user, profile, authLoading])

  const calendarBounds = useMemo(
    () => adminCalendarFetchBounds(calendarDate),
    [calendarDate]
  )

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const role = profile?.role ?? profileCache.get(user.id)?.role
    if (role && role !== 'admin') {
      setLoading(false)
      return
    }
    loadSessionsForCalendar(calendarBounds)
  }, [
    user,
    profile?.role,
    calendarBounds.windowStartStr,
    calendarBounds.windowEndStr,
    calendarBounds.fetchEndStr,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) setCalendarView('agenda')
  }, [])

  /** When opened from attendance (e.g. ?date=2026-04-19), focus the calendar on that day. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const d = new URLSearchParams(window.location.search).get('date')
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return
    const parsed = parse(d, 'yyyy-MM-dd', new Date())
    if (!Number.isNaN(parsed.getTime())) setCalendarDate(parsed)
  }, [])

  useEffect(() => {
    let lastWide = typeof window !== 'undefined' && window.innerWidth >= 768

    function onResize() {
      const w = window.innerWidth
      const h = window.innerHeight
      setWindowSize({ w, h })
      const wide = w >= 768
      if (wide !== lastWide) {
        lastWide = wide
        setCalendarView(wide ? 'week' : 'agenda')
      }
    }

    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const calendarEvents = useMemo(() => {
    const expanded = expandRecurringSessions(
      sessions,
      calendarBounds.windowStart,
      calendarBounds.windowEnd,
      sessionExceptions
    )
    return expanded
      .map((s) => {
        let start = combineSessionDateAndTime(s.session_date, s.start_time)
        let end = combineSessionDateAndTime(s.session_date, s.end_time)
        if (Number.isNaN(start.getTime())) return null
        if (Number.isNaN(end.getTime()) || end <= start) {
          end = new Date(start.getTime() + 60 * 60 * 1000)
        }
        return {
          id: s.id + '_' + s.session_date,
          title:
            s.training_session_squads?.map((ts) => ts.squads?.name).filter(Boolean).join(', ') ||
            'No squad',
          start,
          end,
          resource: s,
        }
      })
      .filter(Boolean)
  }, [sessions, calendarBounds, sessionExceptions])

  function getOccurrenceDate(session) {
    return session?.occurrence_date || session?.session_date
  }

  function buildSessionFormFromEvent(session, { forSeriesEdit = false } = {}) {
    const parsed = parseRecurrencePattern(session.recurrence_pattern)
    const anchor =
      session.series_anchor_date ||
      sessions.find((s) => s.id === session.id)?.session_date ||
      session.session_date
    const displayDate = forSeriesEdit ? anchor : getOccurrenceDate(session)
    return {
      session_date: displayDate,
      start_time: session.start_time,
      end_time: session.end_time,
      pool_location: session.pool_location,
      facility_id: session.facility_id || '',
      coach_id: session.coach_id || '',
      squad_ids: session.training_session_squads?.map((ts) => ts.squad_id) || [],
      is_recurring: session.is_recurring || false,
      recurrence_type: parsed.type,
      recurrence_weekday: parsed.options.weekday || '',
      recurrence_ordinal: parsed.options.ordinal || '',
      recurrence_day_type: parsed.options.day_type || 'first',
      recurrence_annually_date: parsed.options.date || '',
      recurrence_custom_interval: parsed.options.interval || '1',
      recurrence_custom_unit: parsed.options.unit || 'week',
      recurrence_custom_weekdays: parsed.options.weekdays || [],
      recurrence_end_date: session.recurrence_end_date || '',
    }
  }

  async function loadSessionsForCalendar(bounds) {
    const supabase = createClient()
    const isFirstLoad = sessions.length === 0 && loading
    if (isFirstLoad) {
      setLoading(true)
    } else {
      setSessionsLoading(true)
    }

    try {
      const [sessionsRes, exceptionsRes] = await Promise.all([
        fetchSessionsForCalendarWindow(
          supabase,
          bounds.windowStartStr,
          bounds.fetchEndStr,
          undefined,
          { displayEndStr: bounds.windowEndStr }
        ),
        fetchSessionExceptionsForWindow(
          supabase,
          bounds.windowStartStr,
          bounds.windowEndStr
        ),
      ])

      if (sessionsRes.error) throw sessionsRes.error
      const rows = sessionsRes.data || []
      setSessions(rows)

      if (exceptionsRes.error) {
        console.error('Error loading session exceptions:', exceptionsRes.error)
        setSessionExceptions([])
      } else {
        setSessionExceptions(exceptionsRes.data || [])
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
      setSessionsLoading(false)
    }
  }

  /** Reload calendar data after create/edit/delete (keeps current visible range). */
  function loadSessions() {
    return loadSessionsForCalendar(calendarBounds)
  }

  async function loadCoaches() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.rpc('list_assignable_coaches')
      if (error) throw error
      setCoachList(data || [])
    } catch (error) {
      console.error('Error loading coaches:', error)
      setCoachList([])
    }
  }

  async function loadSquads() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('squads')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setSquadList(data || [])
    } catch (error) {
      console.error('Error loading squads:', error)
    }
  }

  async function loadFacilities() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, lanes, pool_length, address')
        .order('name')

      if (error) throw error
      setFacilities(data || [])
    } catch (error) {
      console.error('Error loading facilities:', error)
      toast.error('Failed to load facilities')
    }
  }

  async function handleCreateSession() {
    const role = profile?.role ?? (user ? profileCache.get(user.id)?.role : null)
    if (role !== 'admin') {
      toast.error('Only admins can create training sessions')
      return
    }

    if (!sessionForm.session_date || !sessionForm.start_time || !sessionForm.end_time || sessionForm.squad_ids.length === 0) {
      toast.error('Please fill in all required fields including at least one squad')
      return
    }

    if (showCustomPool && !customPoolName) {
      toast.error('Please enter a pool name')
      return
    }

    if (!showCustomPool && !sessionForm.facility_id) {
      toast.error('Please select a pool location')
      return
    }

    if (
      sessionForm.is_recurring &&
      sessionForm.recurrence_type === 'custom' &&
      sessionForm.recurrence_custom_unit === 'week' &&
      (!Array.isArray(sessionForm.recurrence_custom_weekdays) || sessionForm.recurrence_custom_weekdays.length === 0)
    ) {
      toast.error('Pick at least one day of the week')
      return
    }

    if (
      sessionForm.is_recurring &&
      sessionForm.recurrence_end_date &&
      sessionForm.recurrence_end_date < sessionForm.session_date
    ) {
      toast.error('Recurrence end date must be on or after the session start date')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let facilityId = sessionForm.facility_id
      let poolLocation = sessionForm.pool_location

      // If custom pool, create facility first
      if (showCustomPool && customPoolName) {
        const { data: newFacility, error: facilityError } = await supabase
          .from('facilities')
          .insert({
            name: customPoolName,
            lanes: 6,
            pool_length: 25,
            address: '',
          })
          .select()
          .single()

        if (facilityError) throw facilityError
        facilityId = newFacility.id
        poolLocation = newFacility.name
        
        // Reload facilities to include the new one
        await loadFacilities()
        toast.success('New pool location added!')
      }

      // Build recurrence pattern JSON
      let recurrencePattern = null
      if (sessionForm.is_recurring) {
        const options = {}
        
        switch (sessionForm.recurrence_type) {
          case 'weekly_on_day':
            options.weekday = sessionForm.recurrence_weekday || getWeekday(sessionForm.session_date)
            break
          case 'monthly_on_week_day':
            options.weekday = sessionForm.recurrence_weekday || getWeekday(sessionForm.session_date)
            options.ordinal = sessionForm.recurrence_ordinal || getOrdinalWeek(sessionForm.session_date)
            break
          case 'monthly_on_first_last':
            options.day_type = sessionForm.recurrence_day_type
            break
          case 'annually':
            options.date = sessionForm.recurrence_annually_date
            break
          case 'custom':
            options.interval = sessionForm.recurrence_custom_interval
            options.unit = sessionForm.recurrence_custom_unit
            options.weekdays = sessionForm.recurrence_custom_weekdays
            break
        }
        
        recurrencePattern = buildRecurrencePattern(sessionForm.recurrence_type, options)
      }

      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_date: sessionForm.session_date,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          pool_location: poolLocation,
          facility_id: facilityId,
          coach_id: sessionForm.coach_id || user?.id || null,
          squad_ids: sessionForm.squad_ids,
          is_recurring: sessionForm.is_recurring,
          recurrence_pattern: recurrencePattern,
          recurrence_end_date:
            sessionForm.is_recurring && sessionForm.recurrence_end_date
              ? sessionForm.recurrence_end_date
              : null,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          res.status === 401
            ? 'Session expired — sign in again as admin'
            : res.status === 403
              ? 'Only admins can create training sessions'
              : payload.error || 'Failed to create session'
        throw new Error(msg)
      }

      toast.success('Training session created successfully')
      const createdDate = sessionForm.session_date
      if (createdDate) {
        const focus = parse(createdDate, 'yyyy-MM-dd', new Date())
        if (!Number.isNaN(focus.getTime())) setCalendarDate(focus)
      }
      setShowCreateModal(false)
      setShowCustomPool(false)
      setCustomPoolName('')
      setSessionForm({
        session_date: '',
        start_time: '',
        end_time: '',
        squad_ids: [],
        pool_location: '',
        facility_id: '',
        is_recurring: false,
        recurrence_type: 'weekly',
        recurrence_weekday: '',
        recurrence_ordinal: '',
        recurrence_day_type: 'first',
        recurrence_annually_date: '',
        recurrence_custom_interval: '1',
        recurrence_custom_unit: 'week',
        recurrence_custom_weekdays: [],
        recurrence_end_date: '',
      })
      loadSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error(error?.message || 'Failed to create session')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveOccurrenceOverride() {
    if (!editingSession || !editingOccurrenceDate) return

    if (!sessionForm.session_date || !sessionForm.start_time || !sessionForm.end_time || sessionForm.squad_ids.length === 0) {
      toast.error('Please fill in all required fields including at least one squad')
      return
    }

    if (!showCustomPool && !sessionForm.facility_id) {
      toast.error('Please select a pool location')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let facilityId = sessionForm.facility_id
      let poolLocation = sessionForm.pool_location

      if (showCustomPool && customPoolName) {
        const { data: newFacility, error: facilityError } = await supabase
          .from('facilities')
          .insert({ name: customPoolName, lanes: 6, pool_length: 25, address: '' })
          .select()
          .single()
        if (facilityError) throw facilityError
        facilityId = newFacility.id
        poolLocation = newFacility.name
        await loadFacilities()
      }

      const { data: existing } = await supabase
        .from('training_session_exceptions')
        .select('id')
        .eq('session_id', editingSession.id)
        .eq('occurrence_date', editingOccurrenceDate)
        .maybeSingle()

      const payload = {
        session_id: editingSession.id,
        occurrence_date: editingOccurrenceDate,
        status: 'override',
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        coach_id: sessionForm.coach_id || null,
        facility_id: facilityId || null,
        pool_location: poolLocation,
      }

      let exceptionId = existing?.id
      if (existing?.id) {
        const { error } = await supabase
          .from('training_session_exceptions')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('training_session_exceptions')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        exceptionId = inserted.id
      }

      await supabase
        .from('training_session_exception_squads')
        .delete()
        .eq('exception_id', exceptionId)

      if (sessionForm.squad_ids.length > 0) {
        const { error: squadErr } = await supabase
          .from('training_session_exception_squads')
          .insert(sessionForm.squad_ids.map((squad_id) => ({ exception_id: exceptionId, squad_id })))
        if (squadErr) throw squadErr
      }

      toast.success('This occurrence updated (series unchanged)')
      requestSessionScheduleNotify({
        sessionId: editingSession.id,
        changeKind: 'session_occurrence_updated',
        occurrenceDate: editingOccurrenceDate,
        squadIds: sessionForm.squad_ids,
      })
      setShowEditModal(false)
      setEditingSession(null)
      setEditScope(null)
      setEditingOccurrenceDate(null)
      loadSessions()
    } catch (error) {
      console.error('Error saving occurrence override:', error)
      toast.error('Failed to update this occurrence')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelOccurrence(session, occurrenceDate) {
    const supabase = createClient()
    try {
      const { data: existing } = await supabase
        .from('training_session_exceptions')
        .select('id')
        .eq('session_id', session.id)
        .eq('occurrence_date', occurrenceDate)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('training_session_exceptions')
          .update({ status: 'cancelled' })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('training_session_exceptions').insert({
          session_id: session.id,
          occurrence_date: occurrenceDate,
          status: 'cancelled',
        })
        if (error) throw error
      }

      toast.success('This occurrence cancelled')
      requestSessionScheduleNotify({
        sessionId: session.id,
        changeKind: 'session_occurrence_cancelled',
        occurrenceDate,
        squadIds: (session.training_session_squads || []).map((l) => l.squad_id).filter(Boolean),
      })
      setSelectedEvent(null)
      loadSessions()
    } catch (error) {
      console.error('Error cancelling occurrence:', error)
      toast.error('Failed to cancel this occurrence')
    }
  }

  function handleSaveEdit() {
    if (editScope === 'occurrence') {
      handleSaveOccurrenceOverride()
    } else {
      handleEditSession()
    }
  }

  function openEditModal(session, scope) {
    const baseSession = sessions.find((s) => s.id === session.id) || session
    setEditingSession(baseSession)
    setEditScope(scope)
    setEditingOccurrenceDate(scope === 'occurrence' ? getOccurrenceDate(session) : null)
    setShowCustomPool(!session.facility_id)
    setCustomPoolName(!session.facility_id ? session.pool_location : '')
    setSessionForm(buildSessionFormFromEvent(session, { forSeriesEdit: scope === 'series' }))
    setShowEditModal(true)
  }

  async function handleEditSession() {
    if (!editingSession) return

    if (!sessionForm.session_date || !sessionForm.start_time || !sessionForm.end_time || sessionForm.squad_ids.length === 0) {
      toast.error('Please fill in all required fields including at least one squad')
      return
    }

    if (showCustomPool && !customPoolName) {
      toast.error('Please enter a pool name')
      return
    }

    if (!showCustomPool && !sessionForm.facility_id) {
      toast.error('Please select a pool location')
      return
    }

    if (
      sessionForm.is_recurring &&
      sessionForm.recurrence_type === 'custom' &&
      sessionForm.recurrence_custom_unit === 'week' &&
      (!Array.isArray(sessionForm.recurrence_custom_weekdays) || sessionForm.recurrence_custom_weekdays.length === 0)
    ) {
      toast.error('Pick at least one day of the week')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let facilityId = sessionForm.facility_id
      let poolLocation = sessionForm.pool_location

      // If custom pool, create facility first
      if (showCustomPool && customPoolName) {
        const { data: newFacility, error: facilityError } = await supabase
          .from('facilities')
          .insert({
            name: customPoolName,
            lanes: 6,
            pool_length: 25,
            address: '',
          })
          .select()
          .single()

        if (facilityError) throw facilityError
        facilityId = newFacility.id
        poolLocation = newFacility.name
        
        // Reload facilities to include the new one
        await loadFacilities()
        toast.success('New pool location added!')
      }

      // Build recurrence pattern JSON
      let recurrencePattern = null
      if (sessionForm.is_recurring) {
        const options = {}
        
        switch (sessionForm.recurrence_type) {
          case 'weekly_on_day':
            options.weekday = sessionForm.recurrence_weekday || getWeekday(sessionForm.session_date)
            break
          case 'monthly_on_week_day':
            options.weekday = sessionForm.recurrence_weekday || getWeekday(sessionForm.session_date)
            options.ordinal = sessionForm.recurrence_ordinal || getOrdinalWeek(sessionForm.session_date)
            break
          case 'monthly_on_first_last':
            options.day_type = sessionForm.recurrence_day_type
            break
          case 'annually':
            options.date = sessionForm.recurrence_annually_date
            break
          case 'custom':
            options.interval = sessionForm.recurrence_custom_interval
            options.unit = sessionForm.recurrence_custom_unit
            options.weekdays = sessionForm.recurrence_custom_weekdays
            break
        }
        
        recurrencePattern = buildRecurrencePattern(sessionForm.recurrence_type, options)
      }

      const { error } = await supabase
        .from('training_sessions')
        .update({
          session_date: sessionForm.session_date,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          pool_location: poolLocation,
          facility_id: facilityId,
          coach_id: sessionForm.coach_id || editingSession.coach_id || user.id,
          is_recurring: sessionForm.is_recurring,
          recurrence_pattern: recurrencePattern,
          recurrence_end_date: sessionForm.is_recurring && sessionForm.recurrence_end_date ? sessionForm.recurrence_end_date : null,
        })
        .eq('id', editingSession.id)

      if (error) throw error

      // Sync squad associations: delete existing then re-insert
      await supabase.from('training_session_squads').delete().eq('session_id', editingSession.id)
      if (sessionForm.squad_ids.length > 0) {
        const { error: squadError } = await supabase
          .from('training_session_squads')
          .insert(sessionForm.squad_ids.map(squad_id => ({ session_id: editingSession.id, squad_id })))
        if (squadError) throw squadError
      }

      toast.success('Entire series updated successfully')
      requestSessionScheduleNotify({
        sessionId: editingSession.id,
        changeKind: 'session_series_updated',
        squadIds: sessionForm.squad_ids,
      })
      setShowEditModal(false)
      setEditingSession(null)
      setEditScope(null)
      setEditingOccurrenceDate(null)
      setShowCustomPool(false)
      setCustomPoolName('')
      loadSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      toast.error('Failed to update session')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntireSeries(session) {
    if (!confirm(`Delete the entire recurring series (all dates)?`)) {
      return
    }

    const supabase = createClient()
    const squadIds = (session.training_session_squads || [])
      .map((l) => l.squad_id)
      .filter(Boolean)

    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', session.id)

      if (error) throw error

      toast.success('Series deleted')
      requestSessionScheduleNotify({
        sessionId: session.id,
        changeKind: 'session_deleted',
        squadIds,
      })
      setSelectedEvent(null)
      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    }
  }

  function requestDelete(session) {
    if (session.is_recurring) {
      setScopeChoice({ action: 'delete', session })
      return
    }
    if (!confirm(`Delete session on ${formatDate(getOccurrenceDate(session))}?`)) return
    handleDeleteEntireSeries(session)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Training Sessions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                Manage pool schedule and training sessions
              </p>
            </div>
            <Button className="w-full sm:w-auto shrink-0 justify-center" onClick={() => setShowCreateModal(true)}>
              + Create Session
            </Button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 md:hidden">
            Tap a session to view details, edit, or delete. Tap an empty slot or use Create Session to add one.
          </p>
          <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400 mb-3">
            Click a session to open details. Click a time slot to create a session for that date.
          </p>

          {!sessionsLoading && sessions.length === 0 && (
            <Card className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                No sessions in this date range. Create a session or move the calendar to another month.
              </p>
            </Card>
          )}

          {/* Squad colour legend: one pill per family (not per DB squad row) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {SQUAD_LEGEND_CHIPS.map(({ label, cls }) => (
              <span key={label} className={`squad-legend-chip py-1.5 px-3 text-sm ${cls}`}>
                {label}
              </span>
            ))}
          </div>

          <div
            className={`admin-sessions-calendar rbc-wrapper bg-white dark:bg-gray-800 rounded-xl shadow p-2 sm:p-3 min-h-[min(70dvh,32rem)] md:min-h-[500px]${
              calendarView === 'week' || calendarView === 'day'
                ? ' admin-sessions-calendar--week-scroll'
                : ''
            }${sessionsLoading ? ' opacity-60 pointer-events-none' : ''}`}
            aria-busy={sessionsLoading}
          >
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: calendarHeight }}
              view={calendarView}
              onView={setCalendarView}
              date={calendarDate}
              onNavigate={setCalendarDate}
              views={CALENDAR_VIEWS}
              dayLayoutAlgorithm="no-overlap"
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              onSelectSlot={(slotInfo) => {
                setSessionForm((f) => ({ ...f, session_date: format(slotInfo.start, 'yyyy-MM-dd') }))
                setShowCreateModal(true)
              }}
              selectable
              popup={false}
              onShowMore={(events, date) => setMoreEvents({ date, events })}
              eventPropGetter={(event) => {
                const props = getSquadCalendarEventProps(event.resource)
                return { className: props.className, style: props.style }
              }}
              components={{
                toolbar: SessionsCalendarToolbar,
                event: ({ event }) => (
                  <span className="text-xs font-medium leading-tight block truncate">
                    {event.title}
                    {event.resource?.is_recurring && (
                      <span className="ml-1 opacity-70">↻</span>
                    )}
                  </span>
                ),
              }}
            />
          </div>
        </div>
      </div>

      {/* More Events (for Month "+N more") */}
      <Modal
        isOpen={!!moreEvents}
        onClose={() => setMoreEvents(null)}
        title={moreEvents ? `Sessions on ${formatDate(moreEvents.date)}` : 'Sessions'}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setMoreEvents(null)}>Close</Button>
          </div>
        }
      >
        {moreEvents && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Tap a session to view, edit, or delete.
            </p>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 -mx-2">
              {moreEvents.events.map((event, idx) => {
                const { style } = getSquadCalendarEventProps(event.resource)
                const timeLabel =
                  event.start instanceof Date && event.end instanceof Date
                    ? `${format(event.start, 'p')} – ${format(event.end, 'p')}`
                    : `${event.resource?.start_time ?? ''} – ${event.resource?.end_time ?? ''}`
                return (
                  <li key={event.id ?? idx}>
                    <button
                      type="button"
                      onClick={() => {
                        const session = event.resource
                        setMoreEvents(null)
                        setSelectedEvent(session)
                      }}
                      className="w-full text-left flex items-stretch gap-3 px-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <span
                        aria-hidden="true"
                        className="w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: style?.backgroundColor }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {event.title}
                          {event.resource?.is_recurring && (
                            <span className="ml-1 text-gray-400" aria-label="Recurring">↻</span>
                          )}
                        </span>
                        <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {timeLabel}
                          {event.resource?.pool_location ? ` · ${event.resource.pool_location}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Session Details"
        size="md"
        footer={
          <div className="flex gap-3 justify-end flex-wrap">
            <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>
            <Button
              variant="secondary"
              onClick={() => {
                const session = selectedEvent
                const date = getOccurrenceDate(session)
                setSelectedEvent(null)
                router.push(`/admin/sessions/${session.id}/attendance?date=${encodeURIComponent(date)}`)
              }}
            >
              Manage Attendance
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const session = selectedEvent
                setSelectedEvent(null)
                if (session.is_recurring) {
                  setScopeChoice({ action: 'edit', session })
                } else {
                  openEditModal(session, 'series')
                }
              }}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const session = selectedEvent
                setSelectedEvent(null)
                requestDelete(session)
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2 border border-gray-100 dark:border-gray-700">
              {selectedEvent.is_recurring ? (
                <>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Edit</span> or{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-200">Delete</span> lets you change{' '}
                  <strong>only this date</strong> or the <strong>entire series</strong>. Use{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-200">Manage attendance</span> for this
                  calendar date.
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Edit</span> changes this session.
                  Use <span className="font-medium text-gray-800 dark:text-gray-200">Manage attendance</span> for the
                  register.
                </>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(getOccurrenceDate(selectedEvent))}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedEvent.start_time} – {selectedEvent.end_time}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pool</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedEvent.pool_location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recurrence</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {selectedEvent.is_recurring
                    ? formatRecurrencePattern(selectedEvent.recurrence_pattern)
                    : 'One-time'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Squads</p>
              <div className="flex flex-wrap gap-2">
                {(selectedEvent.training_session_squads?.map((ts) => ts.squads?.name).filter(Boolean) || []).length > 0
                  ? selectedEvent.training_session_squads.map((ts, i) =>
                      ts.squads?.name ? (
                        <span key={i} className="px-3 py-1 bg-primary text-white text-sm rounded-full">{ts.squads.name}</span>
                      ) : null
                    )
                  : <span className="text-sm text-gray-500 dark:text-gray-400">No squad assigned</span>
                }
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit scope: this occurrence vs entire series */}
      <Modal
        isOpen={!!scopeChoice}
        onClose={() => setScopeChoice(null)}
        title={scopeChoice?.action === 'delete' ? 'Delete recurring session' : 'Edit recurring session'}
        size="sm"
      >
        {scopeChoice && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(getOccurrenceDate(scopeChoice.session))} —{' '}
              {formatRecurrencePattern(scopeChoice.session.recurrence_pattern)}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  const { action, session } = scopeChoice
                  setScopeChoice(null)
                  const date = getOccurrenceDate(session)
                  if (action === 'edit') {
                    openEditModal(session, 'occurrence')
                  } else {
                    if (!confirm(`Cancel only the session on ${formatDate(date)}?`)) return
                    handleCancelOccurrence(session, date)
                  }
                }}
              >
                {scopeChoice.action === 'delete' ? 'This occurrence only' : 'Edit this occurrence only'}
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  const { action, session } = scopeChoice
                  setScopeChoice(null)
                  if (action === 'edit') {
                    openEditModal(session, 'series')
                  } else {
                    handleDeleteEntireSeries(session)
                  }
                }}
              >
                {scopeChoice.action === 'delete' ? 'Entire series' : 'Edit entire series'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setShowCustomPool(false)
          setCustomPoolName('')
        }}
        title="Create Training Session"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setShowCustomPool(false)
                setCustomPoolName('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              loading={saving}
            >
              Create Session
            </Button>
          </div>
        }
      >
        <SessionFormFields
          sessionForm={sessionForm}
          setSessionForm={setSessionForm}
          facilities={facilities}
          squadList={squadList}
          coachList={coachList}
          showCustomPool={showCustomPool}
          setShowCustomPool={setShowCustomPool}
          customPoolName={customPoolName}
          setCustomPoolName={setCustomPoolName}
        />
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingSession(null)
          setEditScope(null)
          setEditingOccurrenceDate(null)
          setShowCustomPool(false)
          setCustomPoolName('')
        }}
        title={
          editScope === 'occurrence' && editingOccurrenceDate
            ? `Edit occurrence — ${formatDate(editingOccurrenceDate)}`
            : 'Edit entire series'
        }
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false)
                setEditingSession(null)
                setShowCustomPool(false)
                setCustomPoolName('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <SessionFormFields
          sessionForm={sessionForm}
          setSessionForm={setSessionForm}
          facilities={facilities}
          squadList={squadList}
          coachList={coachList}
          showCustomPool={showCustomPool}
          setShowCustomPool={setShowCustomPool}
          customPoolName={customPoolName}
          setCustomPoolName={setCustomPoolName}
          hideRecurrence={editScope === 'occurrence'}
          lockSessionDate={editScope === 'occurrence'}
        />
      </Modal>

      <Footer />
    </>
  )
}
