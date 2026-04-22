/**
 * Parent / co-parent data access: swimmers and invoices use `parent_id` = primary account owner.
 * Delegates appear in family_account_members with status active.
 */

export async function fetchParentIdsForDataAccess(supabase, userId) {
  if (!userId) return []
  const ids = new Set([userId])
  const { data, error } = await supabase
    .from('family_account_members')
    .select('primary_parent_id')
    .eq('member_user_id', userId)
    .eq('status', 'active')

  if (error) {
    console.error('fetchParentIdsForDataAccess:', error)
    return [userId]
  }
  for (const row of data || []) {
    if (row.primary_parent_id) ids.add(row.primary_parent_id)
  }
  return [...ids]
}

/** Client-side: can this user access rows owned by swimmerParentId (primary)? */
export async function userCanAccessSwimmerParent(supabase, userId, swimmerParentId) {
  if (!userId || !swimmerParentId) return false
  if (userId === swimmerParentId) return true
  const { data, error } = await supabase.rpc('auth_user_can_access_parent_data', {
    target_parent_id: swimmerParentId,
  })
  if (error) {
    console.error('userCanAccessSwimmerParent:', error)
    return false
  }
  return Boolean(data)
}
