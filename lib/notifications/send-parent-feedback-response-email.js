import { sendParentFeedbackResponseEmail as sendEmail } from '@/lib/utils/send-email'

export async function sendParentFeedbackResponseEmail(supabase, { parentId, subject, adminResponse }) {
  if (process.env.PARENT_FEEDBACK_EMAIL === '0') {
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
      subject: subject || 'Your feedback',
      adminResponse: adminResponse || '',
    })
  } catch (e) {
    console.error('sendParentFeedbackResponseEmail (non-fatal):', e)
    return { ok: false }
  }
}
