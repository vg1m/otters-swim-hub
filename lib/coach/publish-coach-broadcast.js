import { insertNotification } from '@/lib/notifications/insert-notification'
import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'
import { sendCoachBroadcastParentEmail } from '@/lib/notifications/send-coach-broadcast-parent-email'

/**
 * Resolve unique parent profile ids for approved swimmers in coach's squad scope.
 */
export async function resolveCoachSquadParentIds(supabase, coachId) {
  const parentIds = new Set()

  const { data: squadAssignments } = await supabase
    .from('coach_assignments')
    .select('squad_id')
    .eq('coach_id', coachId)
    .not('squad_id', 'is', null)
    .is('swimmer_id', null)

  const squadIds = [...new Set((squadAssignments || []).map((a) => a.squad_id).filter(Boolean))]

  if (squadIds.length > 0) {
    const { data: squadSwimmers, error } = await supabase
      .from('swimmers')
      .select('parent_id')
      .in('squad_id', squadIds)
      .eq('status', 'approved')
      .not('parent_id', 'is', null)

    if (error) {
      console.error('resolveCoachSquadParentIds squad swimmers:', error.message)
    } else {
      for (const s of squadSwimmers || []) {
        if (s.parent_id) parentIds.add(s.parent_id)
      }
    }
  }

  const { data: individual } = await supabase
    .from('coach_assignments')
    .select('swimmers(parent_id, status)')
    .eq('coach_id', coachId)
    .not('swimmer_id', 'is', null)

  for (const row of individual || []) {
    const sw = row.swimmers
    if (sw?.status === 'approved' && sw.parent_id) parentIds.add(sw.parent_id)
  }

  const { data: direct } = await supabase
    .from('swimmers')
    .select('parent_id')
    .eq('coach_id', coachId)
    .eq('status', 'approved')
    .not('parent_id', 'is', null)

  for (const s of direct || []) {
    if (s.parent_id) parentIds.add(s.parent_id)
  }

  return [...parentIds]
}

/**
 * Fan-out coach broadcast by audience.
 */
export async function publishCoachBroadcastFanOut(supabase, broadcast, coachId) {
  const { id, audience, title, body, link_url } = broadcast
  const notifTitle = title || 'Message from your coach'
  const notifBody = body || ''
  let parentsNotified = 0
  let staffNotified = 0

  if (audience === 'parents_in_my_squads') {
    const parentIds = await resolveCoachSquadParentIds(supabase, coachId)
    for (const parentId of parentIds) {
      await insertNotification(supabase, {
        parent_id: parentId,
        type: 'coach_broadcast',
        title: notifTitle,
        body: notifBody,
      })
      parentsNotified += 1
      await sendCoachBroadcastParentEmail(supabase, {
        parentId,
        title: notifTitle,
        body: notifBody,
        linkUrl: link_url,
      })
    }
  } else if (audience === 'coaches') {
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('id, role')
      .in('role', ['admin', 'coach'])

    if (error) {
      console.error('publishCoachBroadcastFanOut staff:', error.message)
    } else {
      for (const person of staff || []) {
        const role = person.role === 'coach' ? 'coach' : 'admin'
        const result = await insertStaffNotification(supabase, {
          recipient_id: person.id,
          role,
          type: 'coach_broadcast',
          title: notifTitle,
          body: notifBody,
          dedupe_key: `${id}:${person.id}`,
          sendEmail: true,
        })
        if (result.inserted) staffNotified += 1
      }
    }
  }

  return { parentsNotified, staffNotified }
}
