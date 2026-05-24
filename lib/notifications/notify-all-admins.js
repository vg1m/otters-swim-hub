import { insertStaffNotification } from '@/lib/notifications/insert-staff-notification'

/**
 * Notify every admin profile. Non-fatal.
 * @param {object} supabase Service role or admin client
 * @param {Omit<Parameters<typeof insertStaffNotification>[1], 'recipient_id' | 'role'>} payload
 */
export async function notifyAllAdmins(supabase, payload) {
  try {
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (error) {
      console.error('notifyAllAdmins: load admins failed (non-fatal):', error.message)
      return { count: 0 }
    }

    let count = 0
    for (const admin of admins || []) {
      const result = await insertStaffNotification(supabase, {
        ...payload,
        recipient_id: admin.id,
        role: 'admin',
      })
      if (result.inserted) count += 1
    }
    return { count }
  } catch (e) {
    console.error('notifyAllAdmins threw (non-fatal):', e)
    return { count: 0 }
  }
}
