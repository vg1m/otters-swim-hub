/** Display metadata for staff notification feed rows. */
export const STAFF_TYPE_META = {
  registration_pending: { icon: '📝', label: 'Registration' },
  registration_needs_squad: { icon: '🏊', label: 'Squad needed' },
  coach_assignment_squad: { icon: '👥', label: 'Squad assignment' },
  coach_assignment_swimmer: { icon: '👤', label: 'Swimmer assignment' },
  session_pay_recorded: { icon: '💰', label: 'Session pay' },
  session_schedule_changed: { icon: '📅', label: 'Schedule' },
}

export function staffNotificationsHubPath(role) {
  if (role === 'admin') return '/admin/notifications'
  if (role === 'coach') return '/coach/notifications'
  return '/login'
}
