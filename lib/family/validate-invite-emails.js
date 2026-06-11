import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { MAX_FAMILY_INVITES_PER_BATCH } from '@/lib/family/family-invite-constants'

export { MAX_FAMILY_INVITES_PER_BATCH }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase — authenticated client (RLS)
 * @param {{ primaryUserId: string, primaryEmail: string, invites: Array<{ email: string, name?: string }> }} params
 * @returns {Promise<{ valid: Array<{ email: string, name: string | null }>, errors: Array<{ email: string, message: string }> }>}
 */
export async function validateInviteEmails(supabase, { primaryUserId, primaryEmail, invites }) {
  const errors = []
  const valid = []

  if (!Array.isArray(invites) || invites.length === 0) {
    return {
      valid: [],
      errors: [{ email: '', message: 'Add at least one email to invite.' }],
    }
  }

  if (invites.length > MAX_FAMILY_INVITES_PER_BATCH) {
    return {
      valid: [],
      errors: [
        {
          email: '',
          message: `You can invite up to ${MAX_FAMILY_INVITES_PER_BATCH} people at a time.`,
        },
      ],
    }
  }

  const primaryNorm = normalizeEmail(primaryEmail)
  const seen = new Set()

  const normalizedRows = invites.map((row, index) => {
    const raw = row?.email ?? ''
    const email = normalizeEmail(raw)
    const name = row?.name?.trim() || null
    return { email, name, raw, index }
  })

  for (const { email, raw, index } of normalizedRows) {
    if (!email) {
      errors.push({ email: raw || `Row ${index + 1}`, message: 'Email is required.' })
      continue
    }
    if (!EMAIL_REGEX.test(email)) {
      errors.push({ email: raw, message: 'Enter a valid email address.' })
      continue
    }
    if (email === primaryNorm) {
      errors.push({ email: raw, message: 'Use a different email from your own account.' })
      continue
    }
    if (seen.has(email)) {
      errors.push({ email: raw, message: 'This email appears more than once in your list.' })
      continue
    }
    seen.add(email)
  }

  if (errors.length > 0) {
    return { valid: [], errors }
  }

  let serviceSupabase
  try {
    serviceSupabase = createServiceRoleClient()
  } catch (e) {
    console.error('validateInviteEmails: service role unavailable', e)
    return {
      valid: [],
      errors: [{ email: '', message: 'Unable to validate invitations. Try again later.' }],
    }
  }

  const emails = [...seen]

  for (const email of emails) {
    const { data: match, error: profileErr } = await serviceSupabase
      .from('profiles')
      .select('email, role')
      .ilike('email', email)
      .maybeSingle()

    if (profileErr) {
      console.error('validateInviteEmails: profile lookup', profileErr)
      return {
        valid: [],
        errors: [{ email: '', message: 'Unable to validate invitations. Try again later.' }],
      }
    }

    if (match?.role === 'coach') {
      errors.push({
        email,
        message: 'This email belongs to a coach account and cannot be invited.',
      })
    } else if (match?.role === 'admin') {
      errors.push({
        email,
        message: 'This email belongs to an admin account and cannot be invited.',
      })
    }
  }

  const { data: existingInvites, error: inviteErr } = await supabase
    .from('family_account_members')
    .select('invited_email, status')
    .eq('primary_parent_id', primaryUserId)
    .in('status', ['pending', 'active'])

  if (inviteErr) {
    console.error('validateInviteEmails: existing invites', inviteErr)
    return {
      valid: [],
      errors: [{ email: '', message: 'Unable to validate invitations. Try again later.' }],
    }
  }

  const existingEmails = new Set(
    (existingInvites || []).map((r) => normalizeEmail(r.invited_email)).filter(Boolean)
  )

  for (const email of emails) {
    if (existingEmails.has(email)) {
      errors.push({ email, message: 'An invite for this email already exists on your account.' })
    }
  }

  if (errors.length > 0) {
    return { valid: [], errors }
  }

  for (const row of normalizedRows) {
    valid.push({ email: row.email, name: row.name })
  }

  return { valid, errors: [] }
}
