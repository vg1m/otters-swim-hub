'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils/date-helpers'
import { buildRecurrencePattern, parseRecurrencePattern, formatRecurrencePattern, getWeekday, getOrdinalWeek, expandRecurringSessions } from '@/lib/utils/recurrence'
import toast from 'react-hot-toast'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getSquadCalendarEventProps } from '@/lib/utils/squad-calendar'
import SessionFormFields from '@/components/admin/SessionFormFields'

/** One pill per squad colour family (calendar events still resolve slug → colour). */
const SQUAD_LEGEND_CHIPS = [
  { label: 'Elite', cls: 'rbc-squad-elite' },
  { label: 'Pups', cls: 'rbc-squad-pups' },
  { label: 'Development', cls: 'rbc-squad-development' },
  { label: 'Masters', cls: 'rbc-squad-masters' },
  { label: 'Other / unassigned', cls: 'rbc-squad-default' },
]

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
    
    // Load data immediately if we have user (even if profile still loading)
    if (user && !sessions.length) {
      loadSessions()
      loadFacilities()
      loadSquads()
      loadCoaches()
    }
  }, [user, profile, authLoading])

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
    const windowStart = startOfMonth(subMonths(calendarDate, 1))
    const windowEnd   = endOfMonth(addMonths(calendarDate, 2))
    return expandRecurringSessions(sessions, windowStart, windowEnd).map((s) => ({
      id:       s.id + '_' + s.session_date,
      title:    (s.training_session_squads?.map((ts) => ts.squads?.name).filter(Boolean).join(', ') || 'No squad'),
      start:    new Date(`${s.session_date}T${s.start_time}`),
      end:      new Date(`${s.session_date}T${s.end_time}`),
      resource: s,
    }))
  }, [sessions, calendarDate])

  async function loadSessions() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, training_session_squads(squad_id, squads(id, name, slug))')
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  async function loadCoaches() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, per_session_rate_kes')
        .in('role', ['coach', 'admin'])
        .order('full_name')
      if (error) throw error
      setCoachList(data || [])
    } catch (error) {
      console.error('Error loading coaches:', error)
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

      const { data: newSession, error } = await supabase
        .from('training_sessions')
        .insert({
          session_date: sessionForm.session_date,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          pool_location: poolLocation,
          facility_id: facilityId,
          coach_id: sessionForm.coach_id || user.id,
          is_recurring: sessionForm.is_recurring,
          recurrence_pattern: recurrencePattern,
          recurrence_end_date: sessionForm.is_recurring && sessionForm.recurrence_end_date ? sessionForm.recurrence_end_date : null,
        })
        .select()
        .single()

      if (error) throw error

      // Insert squad associations
      if (sessionForm.squad_ids.length > 0) {
        const { error: squadError } = await supabase
          .from('training_session_squads')
          .insert(sessionForm.squad_ids.map(squad_id => ({ session_id: newSession.id, squad_id })))
        if (squadError) throw squadError
      }

      toast.success('Training session created successfully')
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
      toast.error('Failed to create session')
    } finally {
      setSaving(false)
    }
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

      toast.success('Session updated successfully')
      setShowEditModal(false)
      setEditingSession(null)
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

  async function handleDeleteSession(session) {
    if (!confirm(`Delete session on ${formatDate(session.session_date)}?`)) {
      return
    }

    const supabase = createClient()

    try {
      const { error} = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', session.id)

      if (error) throw error

      toast.success('Session deleted')
      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    }
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
            }`}
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
                setSelectedEvent(null)
                router.push(`/admin/sessions/${session.id}/attendance`)
              }}
            >
              Manage Attendance
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const session = selectedEvent
                setSelectedEvent(null)
                setEditingSession(session)
                setShowCustomPool(!session.facility_id)
                setCustomPoolName(!session.facility_id ? session.pool_location : '')
                const parsed = parseRecurrencePattern(session.recurrence_pattern)
                setSessionForm({
                  session_date: session.session_date,
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
                })
                setShowEditModal(true)
              }}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const session = selectedEvent
                setSelectedEvent(null)
                handleDeleteSession(session)
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
              <span className="font-medium text-gray-800 dark:text-gray-200">Edit</span> opens the full form to
              change date, time, squads, pool, and recurrence. Use{' '}
              <span className="font-medium text-gray-800 dark:text-gray-200">Manage attendance</span> for the
              register.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(selectedEvent.session_date)}</p>
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
          setShowCustomPool(false)
          setCustomPoolName('')
        }}
        title="Edit Training Session"
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
              onClick={handleEditSession}
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
        />
      </Modal>

      <Footer />
    </>
  )
}
