import { sendCoachBroadcastParentEmail as sendEmail } from '@/lib/utils/send-email'

export async function sendCoachBroadcastParentEmail(supabase, { parentId, title, body, linkUrl }) {
  if (process.env.COACH_BROADCAST_EMAIL === '0') {
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
      title: title || 'Message from your coach',
      body: body || '',
      linkUrl: linkUrl || '',
    })
  } catch (e) {
    console.error('sendCoachBroadcastParentEmail (non-fatal):', e)
    return { ok: false }
  }
}
