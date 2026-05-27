/**
 * Canonical primary account owner for a logged-in parent or active delegate.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function resolvePrimaryParentId(supabase, userId) {
  if (!userId) return userId
  const { data, error } = await supabase
    .from('family_account_members')
    .select('primary_parent_id')
    .eq('member_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('resolvePrimaryParentId:', error.message)
    return userId
  }
  return data?.primary_parent_id || userId
}
