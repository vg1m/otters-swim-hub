import { sendClubAnnouncementEmail as sendEmail } from '@/lib/utils/send-email'

export async function sendClubAnnouncementEmail(supabase, { parentId, title, body, linkUrl }) {
  if (process.env.CLUB_ANNOUNCEMENT_EMAIL === '0') {
    return { skipped: true }
  }
  if (!parentId) return { skipped: true }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', parentId)
      .maybeSingle()

    if (error || !profile?.email?.trim()) {
      return { skipped: true }
    }

    return sendEmail({
      to: profile.email.trim(),
      parentName: profile.full_name?.trim() || 'Parent',
      title: title || 'Club announcement',
      body: body || '',
      linkUrl: linkUrl || '',
    })
  } catch (e) {
    console.error('sendClubAnnouncementEmail (non-fatal):', e)
    return { ok: false }
  }
}
