/**
 * Insert a parent-facing notification. Never throws — failures are non-fatal
 * so a notification problem never blocks the main admin action.
 *
 * @param {object} supabase  Any Supabase client (user JWT with admin role, or service role).
 * @param {{ parent_id: string, type: string, title: string, body?: string, swimmer_id?: string, invoice_id?: string }} payload
 */
export async function insertNotification(supabase, { parent_id, type, title, body, swimmer_id, invoice_id }) {
  if (!parent_id || !type || !title) {
    console.warn('insertNotification: missing required field (parent_id, type, or title) — skipped')
    return
  }
  try {
    const { error } = await supabase.from('notifications').insert({
      parent_id,
      type,
      title,
      body: body ?? null,
      swimmer_id: swimmer_id ?? null,
      invoice_id: invoice_id ?? null,
    })
    if (error) {
      console.error('insertNotification DB error (non-fatal):', error.message)
    }
  } catch (e) {
    console.error('insertNotification threw (non-fatal):', e)
  }
}
