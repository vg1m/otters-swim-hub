/**
 * Client helper: parent coach-assigned notification via admin API (server builds copy).
 */
export async function requestCoachAssignedNotification(swimmerId, coachId) {
  if (!swimmerId) return

  try {
    const res = await fetch('/api/admin/notifications/coach-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        swimmer_id: swimmerId,
        ...(coachId ? { coach_id: coachId } : {}),
      }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      console.warn('coach-assigned notification:', payload.error || res.status)
    }
  } catch (err) {
    console.warn('coach-assigned notification failed (non-fatal):', err)
  }
}
