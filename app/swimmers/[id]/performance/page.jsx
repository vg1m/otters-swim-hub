'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PerformanceEntryModal from '@/components/PerformanceEntryModal'
import CoachNoteModal from '@/components/CoachNoteModal'
import { calculateAge } from '@/lib/utils/date-helpers'
import {
  defaultAttendanceWindow,
  expandScheduledSessionsInWindow,
  fetchTrainingSessionsForAttendanceWindow,
  sessionMatchesSwimmerSquad,
} from '@/lib/parent/swimmerSchedule'
import { userCanAccessSwimmerParent } from '@/lib/parent/effective-parent-ids'
import AttendanceCalendarView from '@/components/AttendanceCalendarView'
import toast from 'react-hot-toast'

const NOTE_TYPE_BADGE = {
  general: { variant: 'default', label: 'General' },
  technique: { variant: 'info', label: 'Technique' },
  fitness: { variant: 'success', label: 'Fitness' },
  achievement: { variant: 'warning', label: 'Achievement' },
  concern: { variant: 'danger', label: 'Concern' },
}

const NOTE_TYPE_CLASSES = {
  general: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  technique: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  fitness: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  achievement: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  concern: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

/** After migration 054: `squads` join; legacy `squad` text only on old DBs. */
function formatSquadLabel(swimmer) {
  if (!swimmer) return '—'
  const rel = swimmer.squads
  const row = Array.isArray(rel) ? rel[0] : rel
  if (row?.name) return row.name
  if (typeof swimmer.squad === 'string' && swimmer.squad) {
    return swimmer.squad.replace(/_/g, ' ')
  }
  return '—'
}

export default function SwimmerPerformancePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const swimmerId = params.id
  const { user, profile, loading: authLoading } = useAuth()

  const [swimmer, setSwimmer] = useState(null)
  const [performances, setPerformances] = useState([])
  const [notes, setNotes] = useState([])
  const [attendanceForCalendar, setAttendanceForCalendar] = useState([])
  const [scheduledForCalendar, setScheduledForCalendar] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('times')

  // Modals
  const [showPerfModal, setShowPerfModal] = useState(false)
  const [editPerf, setEditPerf] = useState(null)
  const [savingPerf, setSavingPerf] = useState(false)

  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editNote, setEditNote] = useState(null)
  const [savingNote, setSavingNote] = useState(false)

  const [showDeletePerf, setShowDeletePerf] = useState(null)
  const [showDeleteNote, setShowDeleteNote] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const cachedProfile = user ? profileCache.get(user.id) : null
  const userRole = profile?.role || cachedProfile?.role
  const isCoach = userRole === 'coach'
  const canEdit = isCoach

  const loadData = useCallback(async () => {
    if (dataLoaded) return
    setLoading(true)
    const supabase = createClient()

    try {
      // Load swimmer details
      const { data: swimmerData, error: swimmerError } = await supabase
        .from('swimmers')
        .select('id, first_name, last_name, date_of_birth, gender, squad_id, status, parent_id, coach_id, squads(name)')
        .eq('id', swimmerId)
        .single()

      if (swimmerError) throw swimmerError

      // Access control: primary parent or linked co-parent
      if (userRole === 'parent') {
        const allowed = await userCanAccessSwimmerParent(
          supabase,
          user.id,
          swimmerData.parent_id
        )
        if (!allowed) {
          router.push('/dashboard')
          return
        }
      }

      setSwimmer(swimmerData)

      // Load performances
      const { data: perfData, error: perfError } = await supabase
        .from('swimmer_performances')
        .select('*')
        .eq('swimmer_id', swimmerId)
        .order('competition_date', { ascending: false })

      if (perfError) throw perfError
      setPerformances(perfData || [])

      // Coach name via profiles embed; RLS allows parents to read coach rows when linked by non-private notes (058).
      const { data: notesData, error: notesError } = await supabase
        .from('coach_notes')
        .select(`
          *,
          coach:profiles!coach_notes_coach_id_fkey(full_name)
        `)
        .eq('swimmer_id', swimmerId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])

      if (userRole === 'parent') {
        const { windowStart, windowEnd, windowEndStr } = defaultAttendanceWindow()
        const [attRes, sessRes] = await Promise.all([
          supabase
            .from('attendance')
            .select(`*, training_sessions (session_date)`)
            .eq('swimmer_id', swimmerId)
            .order('created_at', { ascending: false })
            .limit(500),
          fetchTrainingSessionsForAttendanceWindow(supabase, windowEndStr),
        ])
        if (attRes.error) {
          console.error('Error loading attendance:', attRes.error)
          setAttendanceForCalendar([])
        } else {
          setAttendanceForCalendar(attRes.data || [])
        }
        if (sessRes.error) {
          console.error('Error loading sessions for attendance:', sessRes.error)
          setScheduledForCalendar([])
        } else {
          const expanded = expandScheduledSessionsInWindow(sessRes.data, windowStart, windowEnd)
          setScheduledForCalendar(
            expanded.filter((s) => sessionMatchesSwimmerSquad(s, swimmerData.squad_id))
          )
        }
      } else {
        setAttendanceForCalendar([])
        setScheduledForCalendar([])
      }

      setDataLoaded(true)
    } catch (err) {
      const msg = err?.message || err?.error_description || String(err)
      console.error('Error loading performance data:', msg, err)
      toast.error(msg || 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [swimmerId, user, userRole, dataLoaded, router])

  useEffect(() => {
    if (!authLoading) {
      if (!user || !userRole) {
        router.push('/login')
        return
      }
      if (!['admin', 'coach', 'parent'].includes(userRole)) {
        router.push('/login')
        return
      }
    }
    if (user && swimmerId && !dataLoaded) {
      loadData()
    }
  }, [user, authLoading, swimmerId, userRole, dataLoaded, loadData, router])

  useEffect(() => {
    if (userRole !== 'parent') return
    const tab = searchParams.get('tab')
    if (tab === 'attendance') setActiveTab('attendance')
  }, [searchParams, userRole])

  // ── PERFORMANCE CRUD ─────────────────────────────────────
  async function handleSavePerformance(data) {
    setSavingPerf(true)
    const supabase = createClient()
    try {
      if (editPerf) {
        const { error } = await supabase
          .from('swimmer_performances')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', editPerf.id)
        if (error) throw error
        setPerformances(prev => prev.map(p => p.id === editPerf.id ? { ...p, ...data } : p))
        toast.success('Race time updated')
      } else {
        const { data: inserted, error } = await supabase
          .from('swimmer_performances')
          .insert({ ...data, swimmer_id: swimmerId, recorded_by: user.id })
          .select()
          .single()
        if (error) throw error
        setPerformances(prev => [inserted, ...prev])
        toast.success('Race time added')
      }
      setShowPerfModal(false)
      setEditPerf(null)
    } catch (err) {
      console.error('Error saving performance:', err)
      toast.error('Failed to save race time')
    } finally {
      setSavingPerf(false)
    }
  }

  async function handleDeletePerformance() {
    if (!showDeletePerf) return
    setDeleting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('swimmer_performances')
        .delete()
        .eq('id', showDeletePerf.id)
      if (error) throw error
      setPerformances(prev => prev.filter(p => p.id !== showDeletePerf.id))
      // Also remove notes linked to this performance
      setNotes(prev => prev.map(n => n.performance_id === showDeletePerf.id ? { ...n, performance_id: null } : n))
      toast.success('Race time deleted')
      setShowDeletePerf(null)
    } catch (err) {
      console.error('Error deleting performance:', err)
      toast.error('Failed to delete race time')
    } finally {
      setDeleting(false)
    }
  }

  // ── NOTES CRUD ───────────────────────────────────────────
  async function handleSaveNote(data) {
    setSavingNote(true)
    const supabase = createClient()
    try {
      if (editNote) {
        const { error } = await supabase
          .from('coach_notes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', editNote.id)
        if (error) throw error
        setNotes(prev => prev.map(n => n.id === editNote.id ? { ...n, ...data } : n))
        toast.success('Note updated')
      } else {
        const { data: inserted, error } = await supabase
          .from('coach_notes')
          .insert({ ...data, swimmer_id: swimmerId, coach_id: user.id })
          .select(`*, coach:profiles!coach_notes_coach_id_fkey(full_name)`)
          .single()
        if (error) throw error
        setNotes(prev => [inserted, ...prev])
        toast.success('Note added')
      }
      setShowNoteModal(false)
      setEditNote(null)
    } catch (err) {
      console.error('Error saving note:', err)
      toast.error('Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote() {
    if (!showDeleteNote) return
    setDeleting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('coach_notes')
        .delete()
        .eq('id', showDeleteNote.id)
      if (error) throw error
      setNotes(prev => prev.filter(n => n.id !== showDeleteNote.id))
      toast.success('Note deleted')
      setShowDeleteNote(null)
    } catch (err) {
      console.error('Error deleting note:', err)
      toast.error('Failed to delete note')
    } finally {
      setDeleting(false)
    }
  }

  // ── HELPERS ──────────────────────────────────────────────
  function getBackLink() {
    if (userRole === 'admin') return '/admin/swimmers'
    if (userRole === 'coach') return '/coach'
    return '/dashboard'
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function getLinkedPerf(performanceId) {
    return performances.find(p => p.id === performanceId)
  }

  const pbCount = performances.filter(p => p.is_personal_best).length

  // ── RENDER: LOADING ──────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!swimmer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Swimmer not found</p>
      </div>
    )
  }

  const squadLabel = formatSquadLabel(swimmer)

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link
            href={getBackLink()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Swimmer header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary dark:text-primary-light">
                    {swimmer.first_name?.[0]}{swimmer.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {swimmer.first_name} {swimmer.last_name}
                  </h1>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Age {calculateAge(swimmer.date_of_birth)}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{squadLabel}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{swimmer.gender}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{performances.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Race Entries</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pbCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personal Bests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notes.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Coach Notes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6 w-full max-w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('times')}
              className={`px-4 sm:px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'times'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Race Times
              {performances.length > 0 && (
                <span className="ml-2 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-xs px-1.5 py-0.5 rounded-full">
                  {performances.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-4 sm:px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Coach Notes
              {notes.length > 0 && (
                <span className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded-full">
                  {notes.length}
                </span>
              )}
            </button>
            {userRole === 'parent' && (
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-4 sm:px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Attendance
              </button>
            )}
          </div>

          {/* ── RACE TIMES TAB ── */}
          {activeTab === 'times' && (
            <Card
              title="Race Times & Achievements"
              action={
                canEdit && (
                  <Button size="sm" onClick={() => { setEditPerf(null); setShowPerfModal(true) }}>
                    + Add Time
                  </Button>
                )
              }
            >
              {performances.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No race times recorded yet</p>
                  {canEdit && (
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                      Click &ldquo;+ Add Time&rdquo; to record the first entry
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Event</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Time</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Competition</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Date</th>
                        {canEdit && <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {performances.map(perf => (
                        <tr key={perf.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{perf.event}</span>
                              {perf.is_personal_best && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full w-fit">
                                  ⭐ PB
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-primary dark:text-primary-light text-base">
                              {perf.time_formatted}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            {perf.competition_name || '—'}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                            {formatDate(perf.competition_date)}
                          </td>
                          {canEdit && (
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setEditPerf(perf); setShowPerfModal(true) }}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setShowDeletePerf(perf)}
                                  className="text-xs text-red-500 dark:text-red-400 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ── ATTENDANCE (parents) ── */}
          {activeTab === 'attendance' && userRole === 'parent' && (
            <Card
              title="Training attendance"
              subtitle="Calendar shows scheduled squad sessions and check-ins."
              padding="normal"
            >
              <AttendanceCalendarView
                className="pt-2"
                attendance={attendanceForCalendar}
                scheduledSessions={scheduledForCalendar}
              />
            </Card>
          )}

          {/* ── COACH NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coach Notes</h2>
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditNote(null); setShowNoteModal(true) }}>
                    + Add Note
                  </Button>
                )}
              </div>

              {notes.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No coach notes yet</p>
                    {canEdit && (
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                        Click &ldquo;+ Add Note&rdquo; to add your first note
                      </p>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => {
                    const linkedPerf = note.performance_id ? getLinkedPerf(note.performance_id) : null
                    const typeInfo = NOTE_TYPE_CLASSES[note.note_type] || NOTE_TYPE_CLASSES.general
                    return (
                      <div
                        key={note.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeInfo}`}>
                                {note.note_type?.charAt(0).toUpperCase() + note.note_type?.slice(1)}
                              </span>
                              {note.is_private && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                  Private
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{note.title}</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>

                            {linkedPerf && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Linked to: <span className="font-medium">{linkedPerf.event} — {linkedPerf.time_formatted}</span>
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                              {note.coach?.full_name && (
                                <span>By {note.coach.full_name}</span>
                              )}
                              <span>
                                {new Date(note.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {canEdit && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => { setEditNote(note); setShowNoteModal(true) }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteNote(note)}
                                className="text-xs text-red-500 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Performance Entry Modal */}
      <PerformanceEntryModal
        isOpen={showPerfModal}
        onClose={() => { setShowPerfModal(false); setEditPerf(null) }}
        onSave={handleSavePerformance}
        editRecord={editPerf}
        saving={savingPerf}
      />

      {/* Coach Note Modal */}
      <CoachNoteModal
        isOpen={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditNote(null) }}
        onSave={handleSaveNote}
        editNote={editNote}
        performances={performances}
        saving={savingNote}
      />

      {/* Delete Performance Confirmation */}
      <Modal
        isOpen={!!showDeletePerf}
        onClose={() => setShowDeletePerf(null)}
        title="Delete Race Time"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeletePerf(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeletePerformance} loading={deleting}>Delete</Button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete the race time for{' '}
          <strong className="text-gray-900 dark:text-gray-100">{showDeletePerf?.event}</strong>
          {showDeletePerf?.time_formatted && <> ({showDeletePerf.time_formatted})</>}?
          This cannot be undone.
        </p>
      </Modal>

      {/* Delete Note Confirmation */}
      <Modal
        isOpen={!!showDeleteNote}
        onClose={() => setShowDeleteNote(null)}
        title="Delete Note"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteNote(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteNote} loading={deleting}>Delete</Button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete the note{' '}
          <strong className="text-gray-900 dark:text-gray-100">&ldquo;{showDeleteNote?.title}&rdquo;</strong>?
          This cannot be undone.
        </p>
      </Modal>
    </>
  )
}
