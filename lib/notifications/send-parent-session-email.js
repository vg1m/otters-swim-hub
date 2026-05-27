import { sendSessionScheduleChangeEmail } from '@/lib/utils/send-email'

/**
 * Send parent email for a session schedule change. Server-only; non-fatal.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ parentId: string, title: string, body?: string, changeKind?: string }} params
 */
export async function sendParentSessionScheduleEmail(supabase, { parentId, title, body, changeKind }) {
  if (process.env.PARENT_SESSION_EMAIL === '0') {
    return { skipped: true }
  }

  if (!parentId || !title) {
    return { skipped: true }
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', parentId)
      .maybeSingle()

    if (error) {
      console.error('sendParentSessionScheduleEmail: profile', error.message)
      return { ok: false, error: error.message }
    }

    const to = typeof profile?.email === 'string' ? profile.email.trim() : ''
    if (!to) {
      return { ok: false, skipped: true, message: 'No parent email on file' }
    }

    const result = await sendSessionScheduleChangeEmail({
      to,
      parentName: profile?.full_name?.trim() || 'Parent',
      title,
      body: body || '',
      changeKind,
    })

    if (!result.success && !result.skipped) {
      console.warn('sendParentSessionScheduleEmail:', result.error || result.message)
    }

    return result
  } catch (e) {
    console.error('sendParentSessionScheduleEmail threw (non-fatal):', e)
    return { ok: false, error: e?.message || String(e) }
  }
}
