/**
 * True if coach may access this approved swimmer (squad head, individual assignment, or direct coach_id).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} coachId
 * @param {string} swimmerId
 */
export async function isSwimmerInCoachScope(supabase, coachId, swimmerId) {
  if (!coachId || !swimmerId) return false

  const { data: swimmer, error } = await supabase
    .from('swimmers')
    .select('id, squad_id, coach_id, status, parent_id')
    .eq('id', swimmerId)
    .maybeSingle()

  if (error || !swimmer || swimmer.status !== 'approved') {
    return false
  }

  if (swimmer.coach_id === coachId) return true

  const { data: assignments, error: aErr } = await supabase
    .from('coach_assignments')
    .select('squad_id, swimmer_id')
    .eq('coach_id', coachId)

  if (aErr) {
    console.error('isSwimmerInCoachScope:', aErr.message)
    return false
  }

  for (const a of assignments || []) {
    if (a.swimmer_id === swimmerId) return true
    if (!a.swimmer_id && a.squad_id && a.squad_id === swimmer.squad_id) return true
  }

  return false
}
