import { insertNotification } from '@/lib/notifications/insert-notification'
import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'
import { sendParentSessionScheduleEmail } from '@/lib/notifications/send-parent-session-email'

const CHANGE_KINDS = new Set([
  'session_created',
  'session_series_updated',
  'session_occurrence_updated',
  'session_occurrence_cancelled',
  'session_deleted',
])

function formatDateLabel(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return dateStr
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return ''
  const t = String(timeStr).trim()
  const match = t.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return t
  let h = parseInt(match[1], 10)
  const mm = match[2]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${mm} ${ampm}`
}

function buildCopy(changeKind, session, occurrenceDate, squadNames) {
  const squads = squadNames.length ? squadNames.join(', ') : 'your squad'
  const dateLabel = occurrenceDate ? formatDateLabel(occurrenceDate) : formatDateLabel(session?.session_date)
  const timeRange =
    session?.start_time && session?.end_time
      ? `${formatTimeLabel(session.start_time)} – ${formatTimeLabel(session.end_time)}`
      : ''

  switch (changeKind) {
    case 'session_created':
      return {
        title: `New training session — ${dateLabel || squads}`,
        body: `A new session for ${squads} was scheduled${dateLabel ? ` (${dateLabel})` : ''}${timeRange ? `, ${timeRange}` : ''}. Check your dashboard for details.`,
      }
    case 'session_series_updated':
      return {
        title: `Training schedule updated — ${squads}`,
        body: `The recurring session series for ${squads} was updated${dateLabel ? ` (from ${dateLabel})` : ''}${timeRange ? `. New time: ${timeRange}` : ''}.`,
      }
    case 'session_occurrence_updated':
      return {
        title: `Session changed — ${dateLabel || squads}`,
        body: `The session on ${dateLabel || 'the scheduled date'} for ${squads} was updated${timeRange ? ` (${timeRange})` : ''}.`,
      }
    case 'session_occurrence_cancelled':
      return {
        title: `Session cancelled — ${dateLabel || squads}`,
        body: `The session on ${dateLabel || 'the scheduled date'} for ${squads} has been cancelled.`,
      }
    case 'session_deleted':
      return {
        title: `Training sessions removed — ${squads}`,
        body: `A session series for ${squads} was removed from the schedule.`,
      }
    default:
      return {
        title: 'Training schedule updated',
        body: `There was a change to the training schedule for ${squads}.`,
      }
  }
}

async function loadSquadNames(supabase, squadIds) {
  if (!squadIds?.length) return []
  const { data } = await supabase.from('squads').select('id, name').in('id', squadIds)
  return (data || []).map((s) => s.name).filter(Boolean)
}

async function resolveSquadIds(supabase, sessionId, squadIdsOverride) {
  if (Array.isArray(squadIdsOverride) && squadIdsOverride.length > 0) {
    return [...new Set(squadIdsOverride.filter(Boolean))]
  }
  const { data } = await supabase
    .from('training_session_squads')
    .select('squad_id')
    .eq('session_id', sessionId)
  return [...new Set((data || []).map((r) => r.squad_id).filter(Boolean))]
}

/**
 * Notify parents (approved swimmers in affected squads) and coaches (lead + squad assignments).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase Service-role client
 * @param {{
 *   sessionId: string,
 *   changeKind: string,
 *   occurrenceDate?: string | null,
 *   squadIds?: string[] | null,
 * }} params
 */
export async function notifySessionScheduleChange(supabase, params) {
  const { sessionId, changeKind, occurrenceDate = null, squadIds: squadIdsOverride = null } =
    params || {}

  if (!sessionId || !CHANGE_KINDS.has(changeKind)) {
    console.warn('notifySessionScheduleChange: invalid sessionId or changeKind — skipped')
    return { parentsNotified: 0, coachesNotified: 0, skipped: true }
  }

  let session = null
  if (changeKind !== 'session_deleted') {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('id, session_date, start_time, end_time, pool_location, coach_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (error) {
      console.error('notifySessionScheduleChange: session load', error.message)
      return { parentsNotified: 0, coachesNotified: 0, error: error.message }
    }
    session = data
  }

  const squadIds = await resolveSquadIds(supabase, sessionId, squadIdsOverride)
  const squadNames = await loadSquadNames(supabase, squadIds)
  const { title, body } = buildCopy(changeKind, session, occurrenceDate, squadNames)
  const notifyStamp = Date.now()

  const parentIds = new Set()
  if (squadIds.length > 0) {
    const { data: swimmers, error: swErr } = await supabase
      .from('swimmers')
      .select('id, parent_id, first_name, last_name')
      .in('squad_id', squadIds)
      .eq('status', 'approved')
    if (swErr) {
      console.error('notifySessionScheduleChange: swimmers', swErr.message)
    } else {
      for (const s of swimmers || []) {
        if (s.parent_id) parentIds.add(s.parent_id)
      }
    }
  }

  const coachIds = new Set()
  if (session?.coach_id) coachIds.add(session.coach_id)
  if (squadIds.length > 0) {
    const { data: assignments, error: caErr } = await supabase
      .from('coach_assignments')
      .select('coach_id')
      .in('squad_id', squadIds)
    if (caErr) {
      console.error('notifySessionScheduleChange: coach_assignments', caErr.message)
    } else {
      for (const row of assignments || []) {
        if (row.coach_id) coachIds.add(row.coach_id)
      }
    }
  }

  let parentsNotified = 0
  for (const parentId of parentIds) {
    await insertNotification(supabase, {
      parent_id: parentId,
      type: 'session_schedule_changed',
      title,
      body,
      session_id: sessionId,
    })
    parentsNotified += 1
    await sendParentSessionScheduleEmail(supabase, {
      parentId,
      title,
      body,
      changeKind,
    })
  }

  let coachesNotified = 0
  const occKey = occurrenceDate || 'series'
  for (const coachId of coachIds) {
    const result = await insertStaffNotification(supabase, {
      recipient_id: coachId,
      role: 'coach',
      type: 'session_schedule_changed',
      title,
      body,
      session_id: sessionId,
      dedupe_key: `${sessionId}:${occKey}:${changeKind}:${notifyStamp}`,
      sendEmail: true,
    })
    if (result.inserted) coachesNotified += 1
  }

  return { parentsNotified, coachesNotified, squadIds: squadIds.length }
}
