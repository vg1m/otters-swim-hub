/**
 * Squad head coach = coach_assignments row with squad_id set and swimmer_id null.
 * At most one per squad (unique index on squad_id).
 */

/**
 * @param {Array<{ squad_id: string, coach_id: string, profiles?: { full_name?: string } }>} assignments
 * @returns {Map<string, { coachId: string, fullName: string }>}
 */
export function buildSquadPrimaryCoachMap(assignments) {
  const map = new Map()
  for (const row of assignments || []) {
    if (!row.squad_id || row.swimmer_id != null) continue
    map.set(row.squad_id, {
      coachId: row.coach_id,
      fullName: row.profiles?.full_name?.trim() || 'Coach',
    })
  }
  return map
}

/**
 * @param {Map<string, { coachId: string, fullName: string }>} map
 * @param {string|null|undefined} squadId
 */
export function getPrimaryCoachForSquad(map, squadId) {
  if (!squadId) return null
  return map.get(squadId) ?? null
}

/**
 * @param {Array<{ squad_id: string, coach_id: string, swimmer_id?: string|null }>} assignments
 * @param {string} squadId
 * @param {string} [excludeCoachId] - allow same coach when re-saving
 */
export function findSquadHeadConflict(assignments, squadId, excludeCoachId) {
  const row = (assignments || []).find(
    (a) => a.squad_id === squadId && (a.swimmer_id == null || a.swimmer_id === undefined)
  )
  if (!row) return null
  if (excludeCoachId && row.coach_id === excludeCoachId) return null
  return row
}
