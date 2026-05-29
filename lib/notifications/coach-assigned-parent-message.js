/**
 * Parent notification copy when a swimmer gets an assigned coach.
 *
 * @param {{ full_name?: string | null, email?: string | null, phone_number?: string | null } | null | undefined} coach
 */
export function buildCoachAssignedParentNotification({
  swimmerFirstName,
  swimmerLastName,
  coach,
}) {
  const swimmerName =
    [swimmerFirstName, swimmerLastName].filter(Boolean).join(' ').trim() || 'Your swimmer'
  const coachName = coach?.full_name?.trim() || 'A coach'

  const title = `Coach ${coachName} assigned to ${swimmerName}`

  const parts = [`${swimmerName} is now coached by ${coachName}.`, '', `Coach: ${coachName}`]

  const email = coach?.email?.trim()
  const phone = coach?.phone_number?.trim()

  if (email) {
    parts.push(`Email: ${email}`)
  }
  if (phone) {
    parts.push(`Phone: ${phone}`)
  }

  const missing = []
  if (!email) missing.push('email')
  if (!phone) missing.push('phone number')
  if (missing.length > 0) {
    parts.push(
      '',
      `Coach ${missing.join(' and ')} will be shown here when added to their profile.`
    )
  }

  return {
    title,
    body: parts.join('\n'),
  }
}
