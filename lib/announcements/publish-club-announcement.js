import { insertNotification } from '@/lib/notifications/insert-notification'
import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'
import { sendClubAnnouncementEmail } from '@/lib/notifications/send-club-announcement-email'

/**
 * Fan-out a published club announcement to all parents and staff (in-app + email).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase Service role
 * @param {{ id: string, title: string, body: string, link_url?: string | null }} announcement
 */
export async function publishClubAnnouncementFanOut(supabase, announcement) {
  const { id, title, body, link_url } = announcement
  const notifTitle = title || 'Club announcement'
  const notifBody = body || ''
  let parentsNotified = 0
  let staffNotified = 0

  const { data: parents, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'parent')

  if (pErr) {
    console.error('publishClubAnnouncementFanOut parents:', pErr.message)
  } else {
    for (const parent of parents || []) {
      await insertNotification(supabase, {
        parent_id: parent.id,
        type: 'club_announcement',
        title: notifTitle,
        body: notifBody,
      })
      parentsNotified += 1
      await sendClubAnnouncementEmail(supabase, {
        parentId: parent.id,
        title: notifTitle,
        body: notifBody,
        linkUrl: link_url,
      })
    }
  }

  const { data: staff, error: sErr } = await supabase
    .from('profiles')
    .select('id, role, email, full_name')
    .in('role', ['admin', 'coach'])

  if (sErr) {
    console.error('publishClubAnnouncementFanOut staff:', sErr.message)
  } else {
    for (const person of staff || []) {
      const role = person.role === 'coach' ? 'coach' : 'admin'
      const result = await insertStaffNotification(supabase, {
        recipient_id: person.id,
        role,
        type: 'club_announcement',
        title: notifTitle,
        body: notifBody,
        dedupe_key: `${id}:${person.id}`,
        sendEmail: true,
      })
      if (result.inserted) staffNotified += 1
    }
  }

  return { parentsNotified, staffNotified }
}
