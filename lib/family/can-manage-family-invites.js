/**
 * Primary parents can manage family invites; active co-parent delegates cannot.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string | undefined} role — profiles.role
 * @returns {Promise<boolean>}
 */
export async function canManageFamilyInvites(supabase, userId, role) {
  if (!userId || role !== 'parent') return false

  const { data: delegate, error } = await supabase
    .from('family_account_members')
    .select('id')
    .eq('member_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('canManageFamilyInvites:', error.message)
    return false
  }

  return !delegate
}
