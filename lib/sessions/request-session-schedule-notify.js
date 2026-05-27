/**
 * Fire-and-forget session schedule notification (admin UI).
 * @param {{ sessionId: string, changeKind: string, occurrenceDate?: string, squadIds?: string[] }} params
 */
export function requestSessionScheduleNotify(params) {
  const { sessionId, changeKind, occurrenceDate, squadIds } = params || {}
  if (!sessionId || !changeKind) return

  void fetch('/api/admin/sessions/notify-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      sessionId,
      changeKind,
      occurrenceDate: occurrenceDate || undefined,
      squadIds: squadIds?.length ? squadIds : undefined,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.warn('Session schedule notify failed:', data.error || res.status)
    }
  }).catch((err) => {
    console.warn('Session schedule notify failed (non-fatal):', err)
  })
}
