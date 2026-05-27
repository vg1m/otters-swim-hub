/**
 * Detect whether a parent_feedback column exists (migrations 095/096).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {'parent_read_at' | 'admin_read_at'} column
 */
export async function parentFeedbackHasColumn(supabase, column) {
  const { error } = await supabase.from('parent_feedback').select(column).limit(1)
  if (!error) return true
  const msg = error.message || ''
  if (msg.includes(column) && msg.includes('does not exist')) {
    return false
  }
  return true
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function parentFeedbackHasReadAtColumn(supabase) {
  return parentFeedbackHasColumn(supabase, 'parent_read_at')
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function parentFeedbackHasAdminReadAtColumn(supabase) {
  return parentFeedbackHasColumn(supabase, 'admin_read_at')
}
