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
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils/date-helpers'
import { buildRecurrencePattern, parseRecurrencePattern, formatRecurrencePattern, getWeekday, getOrdinalWeek, expandRecurringSessions } from '@/lib/utils/recurrence'
import toast from 'react-hot-toast'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
})

// Map squad slug (or lowercase name) → CSS class applied to the calendar event chip
const SQUAD_COLOR_CLASS = {
  elite:       'rbc-squad-elite',
  pups:        'rbc-squad-pups',
  development: 'rbc-squad-development',
  masters:     'rbc-squad-masters',
}

function squadColorClass(session) {
  const squads = session.training_session_squads ?? []
  if (squads.length === 0) return 'rbc-squad-default'
  // Use the first squad's slug or fall back to lowercased name
  const first = squads[0]?.squads
  const key = (first?.slug || first?.name || '').toLowerCase().replace(/[^a-z]/g, '')
  return SQUAD_COLOR_CLASS[key] || 'rbc-squad-default'
}


export default function SessionsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState([])
  const [facilities, setFacilities] = useState([])
  const [squadList, setSquadList] = useState([])
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
  const [selectedEvent, setSelectedEvent] = useState(null)
  
  const [sessionForm, setSessionForm] = useState({
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
    }
  }, [user, profile, authLoading])

  // Default to agenda view on small screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setCalendarView('agenda')
    }
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
        .select('*, training_session_squads(squad_id, squads(id, name))')
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
          coach_id: user.id,
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
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Training Sessions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage pool schedule and training sessions</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              + Create Session
            </Button>
          </div>

          {/* Squad colour legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { label: 'Elite',       cls: 'rbc-squad-elite' },
              { label: 'Pups',        cls: 'rbc-squad-pups' },
              { label: 'Development', cls: 'rbc-squad-development' },
              { label: 'Masters',     cls: 'rbc-squad-masters' },
              { label: 'Other',       cls: 'rbc-squad-default' },
            ].map(({ label, cls }) => (
              <span key={label} className={`squad-legend-chip ${cls}`}>{label}</span>
            ))}
          </div>

          <div className="rbc-wrapper bg-white dark:bg-gray-800 rounded-xl shadow p-2 min-h-[500px]">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 680 }}
              view={calendarView}
              onView={setCalendarView}
              date={calendarDate}
              onNavigate={setCalendarDate}
              views={['month', 'week', 'day', 'agenda']}
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              onSelectSlot={(slotInfo) => {
                setSessionForm((f) => ({ ...f, session_date: format(slotInfo.start, 'yyyy-MM-dd') }))
                setShowCreateModal(true)
              }}
              selectable
              popup
              eventPropGetter={(event) => ({ className: `rbc-event-custom ${squadColorClass(event.resource)}` })}
              components={{
                event: ({ event }) => (
                  <span className="text-xs font-medium leading-tight">
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
            <div className="grid grid-cols-2 gap-4">
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
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedEvent.pool_location || '—'}</p>
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
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Session Date"
            type="date"
            required
            value={sessionForm.session_date}
            onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start Time"
              type="time"
              required
              value={sessionForm.start_time}
              onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={sessionForm.end_time}
              onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Squads <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {squadList.map(squad => (
                <label key={squad.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={squad.id}
                    checked={sessionForm.squad_ids.includes(squad.id)}
                    onChange={(e) => {
                      const id = e.target.value
                      setSessionForm(prev => ({
                        ...prev,
                        squad_ids: e.target.checked
                          ? [...prev.squad_ids, id]
                          : prev.squad_ids.filter(s => s !== id)
                      }))
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{squad.name}</span>
                </label>
              ))}
            </div>
            {squadList.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No active squads. Create squads under Admin &rsaquo; Squads.</p>
            )}
          </div>
          <div className={showCustomPool ? 'col-span-2' : ''}>
            <Select
              label="Pool Location"
              required
              value={showCustomPool ? 'custom' : (sessionForm.facility_id || '')}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomPool(true)
                  setCustomPoolName('')
                  setSessionForm({ ...sessionForm, facility_id: '', pool_location: '' })
                } else {
                  setShowCustomPool(false)
                  setCustomPoolName('')
                  const facility = facilities.find(f => f.id === e.target.value)
                  setSessionForm({ 
                    ...sessionForm, 
                    facility_id: e.target.value,
                    pool_location: facility?.name || ''
                  })
                }
              }}
              options={[
                ...facilities.map(f => ({ 
                  value: f.id, 
                  label: `${f.name} (${f.lanes} lanes, ${f.pool_length}M)`
                })),
                { value: 'custom', label: '➕ Add New Pool Location' }
              ]}
            />
            {showCustomPool && (
              <div className="mt-4">
                <Input
                  label="New Pool Name"
                  required
                  value={customPoolName}
                  onChange={(e) => setCustomPoolName(e.target.value)}
                  placeholder="e.g., New Training Center"
                  helperText="This pool will be added to your facilities list"
                />
              </div>
            )}
          </div>
          
          {/* Recurring Session Toggle */}
          <div className="col-span-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sessionForm.is_recurring}
                onChange={(e) => setSessionForm({ ...sessionForm, is_recurring: e.target.checked })}
                className="w-5 h-5 rounded text-primary focus:ring-2 focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Recurring Session</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">This session repeats on a schedule</p>
              </div>
            </label>
          </div>

          {sessionForm.is_recurring && (
            <>
              <Select
                label="Recurrence Pattern"
                required={sessionForm.is_recurring}
                value={sessionForm.recurrence_type}
                onChange={(e) => setSessionForm({ ...sessionForm, recurrence_type: e.target.value })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Bi-weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'weekly_on_day', label: 'Weekly on specific day' },
                  { value: 'monthly_on_week_day', label: 'Monthly on specific week/day' },
                  { value: 'monthly_on_first_last', label: 'Monthly on first/last day' },
                  { value: 'annually', label: 'Annually on specific date' },
                  { value: 'custom', label: 'Custom' }
                ]}
              />

              {sessionForm.recurrence_type === 'weekly_on_day' && (
                <Select
                  label="Day of Week"
                  required
                  value={sessionForm.recurrence_weekday}
                  onChange={(e) => setSessionForm({ ...sessionForm, recurrence_weekday: e.target.value })}
                  options={[
                    { value: '0', label: 'Sunday' },
                    { value: '1', label: 'Monday' },
                    { value: '2', label: 'Tuesday' },
                    { value: '3', label: 'Wednesday' },
                    { value: '4', label: 'Thursday' },
                    { value: '5', label: 'Friday' },
                    { value: '6', label: 'Saturday' }
                  ]}
                  helperText={sessionForm.session_date ? `Session date is ${new Date(sessionForm.session_date).toLocaleDateString('en-US', { weekday: 'long' })}` : ''}
                />
              )}

              {sessionForm.recurrence_type === 'monthly_on_week_day' && (
                <>
                  <Select
                    label="Week of Month"
                    required
                    value={sessionForm.recurrence_ordinal}
                    onChange={(e) => setSessionForm({ ...sessionForm, recurrence_ordinal: e.target.value })}
                    options={[
                      { value: '1', label: 'First' },
                      { value: '2', label: 'Second' },
                      { value: '3', label: 'Third' },
                      { value: '4', label: 'Fourth' },
                      { value: '5', label: 'Fifth' }
                    ]}
                  />
                  <Select
                    label="Day of Week"
                    required
                    value={sessionForm.recurrence_weekday}
                    onChange={(e) => setSessionForm({ ...sessionForm, recurrence_weekday: e.target.value })}
                    options={[
                      { value: '0', label: 'Sunday' },
                      { value: '1', label: 'Monday' },
                      { value: '2', label: 'Tuesday' },
                      { value: '3', label: 'Wednesday' },
                      { value: '4', label: 'Thursday' },
                      { value: '5', label: 'Friday' },
                      { value: '6', label: 'Saturday' }
                    ]}
                  />
                </>
              )}

              {sessionForm.recurrence_type === 'monthly_on_first_last' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day Selection
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="day_type"
                        value="first"
                        checked={sessionForm.recurrence_day_type === 'first'}
                        onChange={(e) => setSessionForm({ ...sessionForm, recurrence_day_type: e.target.value })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">First day of month</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="day_type"
                        value="last"
                        checked={sessionForm.recurrence_day_type === 'last'}
                        onChange={(e) => setSessionForm({ ...sessionForm, recurrence_day_type: e.target.value })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Last day of month</span>
                    </label>
                  </div>
                </div>
              )}

              {sessionForm.recurrence_type === 'annually' && (
                <Input
                  label="Date (Month-Day)"
                  type="text"
                  required
                  value={sessionForm.recurrence_annually_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, recurrence_annually_date: e.target.value })}
                  placeholder="MM-DD (e.g., 03-12 for March 12)"
                  helperText="Format: MM-DD"
                />
              )}

              {sessionForm.recurrence_type === 'custom' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Repeat every"
                      type="number"
                      required
                      min="1"
                      max="99"
                      value={sessionForm.recurrence_custom_interval}
                      onChange={(e) => setSessionForm({ ...sessionForm, recurrence_custom_interval: e.target.value })}
                    />
                    <Select
                      label="Unit"
                      required
                      value={sessionForm.recurrence_custom_unit}
                      onChange={(e) => setSessionForm({ ...sessionForm, recurrence_custom_unit: e.target.value })}
                      options={[
                        { value: 'day', label: 'Day(s)' },
                        { value: 'week', label: 'Week(s)' },
                        { value: 'month', label: 'Month(s)' },
                        { value: 'year', label: 'Year(s)' }
                      ]}
                    />
                  </div>

                  {sessionForm.recurrence_custom_unit === 'week' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repeat on days
                      </label>
                      <div className="flex gap-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                          <label key={idx} className="flex flex-col items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sessionForm.recurrence_custom_weekdays.includes(idx)}
                              onChange={(e) => {
                                const days = [...sessionForm.recurrence_custom_weekdays]
                                if (e.target.checked) {
                                  days.push(idx)
                                } else {
                                  const index = days.indexOf(idx)
                                  if (index > -1) days.splice(index, 1)
                                }
                                setSessionForm({ ...sessionForm, recurrence_custom_weekdays: days })
                              }}
                              className="w-5 h-5 rounded text-primary"
                            />
                            <span className="text-xs mt-1 text-gray-700 dark:text-gray-300">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <Input
                label="Recurrence End Date"
                type="date"
                value={sessionForm.recurrence_end_date}
                onChange={(e) => setSessionForm({ ...sessionForm, recurrence_end_date: e.target.value })}
                helperText="Leave blank for indefinite"
              />
            </>
          )}
        </div>
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
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Session Date"
            type="date"
            required
            value={sessionForm.session_date}
            onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start Time"
              type="time"
              required
              value={sessionForm.start_time}
              onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={sessionForm.end_time}
              onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Squads <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {squadList.map(squad => (
                <label key={squad.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={squad.id}
                    checked={sessionForm.squad_ids.includes(squad.id)}
                    onChange={(e) => {
                      const id = e.target.value
                      setSessionForm(prev => ({
                        ...prev,
                        squad_ids: e.target.checked
                          ? [...prev.squad_ids, id]
                          : prev.squad_ids.filter(s => s !== id)
                      }))
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{squad.name}</span>
                </label>
              ))}
            </div>
            {squadList.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No active squads. Create squads under Admin &rsaquo; Squads.</p>
            )}
          </div>
          <div className={showCustomPool ? 'col-span-2' : ''}>
            <Select
              label="Pool Location"
              required
              value={showCustomPool ? 'custom' : (sessionForm.facility_id || '')}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomPool(true)
                  setCustomPoolName('')
                  setSessionForm({ ...sessionForm, facility_id: '', pool_location: '' })
                } else {
                  setShowCustomPool(false)
                  setCustomPoolName('')
                  const facility = facilities.find(f => f.id === e.target.value)
                  setSessionForm({ 
                    ...sessionForm, 
                    facility_id: e.target.value,
                    pool_location: facility?.name || ''
                  })
                }
              }}
              options={[
                ...facilities.map(f => ({ 
                  value: f.id, 
                  label: `${f.name} (${f.lanes} lanes, ${f.pool_length}M)`
                })),
                { value: 'custom', label: '➕ Add New Pool Location' }
              ]}
            />
            {showCustomPool && (
              <div className="mt-4">
                <Input
                  label="New Pool Name"
                  required
                  value={customPoolName}
                  onChange={(e) => setCustomPoolName(e.target.value)}
                  placeholder="e.g., New Training Center"
                  helperText="This pool will be added to your facilities list"
                />
              </div>
            )}
          </div>
          
          {/* Recurring Session Toggle */}
          <div className="col-span-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sessionForm.is_recurring}
                onChange={(e) => setSessionForm({ ...sessionForm, is_recurring: e.target.checked })}
                className="w-5 h-5 rounded text-primary focus:ring-2 focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Recurring Session</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">This session repeats on a schedule</p>
              </div>
            </label>
          </div>

          {sessionForm.is_recurring && (
            <>
              <Select
                label="Recurrence Pattern"
                required={sessionForm.is_recurring}
                value={sessionForm.recurrence_type}
                onChange={(e) => setSessionForm({ ...sessionForm, recurrence_type: e.target.value })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Bi-weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'weekly_on_day', label: 'Weekly on specific day' },
                  { value: 'monthly_on_week_day', label: 'Monthly on specific week/day' },
                  { value: 'monthly_on_first_last', label: 'Monthly on first/last day' },
                  { value: 'annually', label: 'Annually on specific date' },
                  { value: 'custom', label: 'Custom' }
                ]}
              />

              {sessionForm.recurrence_type === 'weekly_on_day' && (
                <Select
                  label="Day of Week"
                  required
                  value={sessionForm.recurrence_weekday}
                  onChange={(e) => setSessionForm({ ...sessionForm, recurrence_weekday: e.target.value })}
                  options={[
                    { value: '0', label: 'Sunday' },
                    { value: '1', label: 'Monday' },
                    { value: '2', label: 'Tuesday' },
                    { value: '3', label: 'Wednesday' },
                    { value: '4', label: 'Thursday' },
                    { value: '5', label: 'Friday' },
                    { value: '6', label: 'Saturday' }
                  ]}
                  helperText={sessionForm.session_date ? `Session date is ${new Date(sessionForm.session_date).toLocaleDateString('en-US', { weekday: 'long' })}` : ''}
                />
              )}

              {sessionForm.recurrence_type === 'monthly_on_week_day' && (
                <>
                  <Select
                    label="Week of Month"
                    required
                    value={sessionForm.recurrence_ordinal}
                    onChange={(e) => setSessionForm({ ...sessionForm, recurrence_ordinal: e.target.value })}
                    options={[
                      { value: '1', label: 'First' },
                      { value: '2', label: 'Second' },
                      { value: '3', label: 'Third' },
                      { value: '4', label: 'Fourth' },
                      { value: '5', label: 'Fifth' }
                    ]}
                  />
                  <Select
                    label="Day of Week"
                    required
                    value={sessionForm.recurrence_weekday}
                    onChange={(e) => setSessionForm({ ...sessionForm, recurrence_weekday: e.target.value })}
                    options={[
                      { value: '0', label: 'Sunday' },
                      { value: '1', label: 'Monday' },
                      { value: '2', label: 'Tuesday' },
                      { value: '3', label: 'Wednesday' },
                      { value: '4', label: 'Thursday' },
                      { value: '5', label: 'Friday' },
                      { value: '6', label: 'Saturday' }
                    ]}
                  />
                </>
              )}

              {sessionForm.recurrence_type === 'monthly_on_first_last' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day Selection
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="day_type"
                        value="first"
                        checked={sessionForm.recurrence_day_type === 'first'}
                        onChange={(e) => setSessionForm({ ...sessionForm, recurrence_day_type: e.target.value })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">First day of month</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="day_type"
                        value="last"
                        checked={sessionForm.recurrence_day_type === 'last'}
                        onChange={(e) => setSessionForm({ ...sessionForm, recurrence_day_type: e.target.value })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Last day of month</span>
                    </label>
                  </div>
                </div>
              )}

              {sessionForm.recurrence_type === 'annually' && (
                <Input
                  label="Date (Month-Day)"
                  type="text"
                  required
                  value={sessionForm.recurrence_annually_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, recurrence_annually_date: e.target.value })}
                  placeholder="MM-DD (e.g., 03-12 for March 12)"
                  helperText="Format: MM-DD"
                />
              )}

              {sessionForm.recurrence_type === 'custom' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Repeat every"
                      type="number"
                      required
                      min="1"
                      max="99"
                      value={sessionForm.recurrence_custom_interval}
                      onChange={(e) => setSessionForm({ ...sessionForm, recurrence_custom_interval: e.target.value })}
                    />
                    <Select
                      label="Unit"
                      required
                      value={sessionForm.recurrence_custom_unit}
                      onChange={(e) => setSessionForm({ ...sessionForm, recurrence_custom_unit: e.target.value })}
                      options={[
                        { value: 'day', label: 'Day(s)' },
                        { value: 'week', label: 'Week(s)' },
                        { value: 'month', label: 'Month(s)' },
                        { value: 'year', label: 'Year(s)' }
                      ]}
                    />
                  </div>

                  {sessionForm.recurrence_custom_unit === 'week' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repeat on days
                      </label>
                      <div className="flex gap-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                          <label key={idx} className="flex flex-col items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sessionForm.recurrence_custom_weekdays.includes(idx)}
                              onChange={(e) => {
                                const days = [...sessionForm.recurrence_custom_weekdays]
                                if (e.target.checked) {
                                  days.push(idx)
                                } else {
                                  const index = days.indexOf(idx)
                                  if (index > -1) days.splice(index, 1)
                                }
                                setSessionForm({ ...sessionForm, recurrence_custom_weekdays: days })
                              }}
                              className="w-5 h-5 rounded text-primary"
                            />
                            <span className="text-xs mt-1 text-gray-700 dark:text-gray-300">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <Input
                label="Recurrence End Date"
                type="date"
                value={sessionForm.recurrence_end_date}
                onChange={(e) => setSessionForm({ ...sessionForm, recurrence_end_date: e.target.value })}
                helperText="Leave blank for indefinite"
              />
            </>
          )}
        </div>
      </Modal>

      <Footer />
    </>
  )
}
