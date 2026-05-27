/**
 * Read-only parent account context for admin feedback and coach roster views.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase Service role or privileged client
 * @param {string} parentId Primary account owner profile id
 * @param {{ submittedById?: string | null }} [opts]
 */
export async function fetchParentAccountContext(supabase, parentId, opts = {}) {
  if (!parentId) return null

  const { submittedById } = opts

  const { data: primary, error: pErr } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, phone_number, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone'
    )
    .eq('id', parentId)
    .maybeSingle()

  if (pErr) {
    console.error('fetchParentAccountContext primary:', pErr.message)
    return null
  }

  let submittedBy = null
  if (submittedById && submittedById !== parentId) {
    const { data: sub } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number')
      .eq('id', submittedById)
      .maybeSingle()
    submittedBy = sub
  }

  const { data: familyRows, error: fErr } = await supabase
    .from('family_account_members')
    .select('id, invited_name, invited_email, status, member_user_id')
    .eq('primary_parent_id', parentId)
    .order('created_at', { ascending: true })

  if (fErr) {
    console.error('fetchParentAccountContext family:', fErr.message)
  }

  const sharedAccess = []
  for (const row of familyRows || []) {
    let memberProfile = null
    if (row.status === 'active' && row.member_user_id) {
      const { data: mp } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .eq('id', row.member_user_id)
        .maybeSingle()
      memberProfile = mp
    }
    sharedAccess.push({
      id: row.id,
      invited_name: row.invited_name,
      invited_email: row.invited_email,
      status: row.status,
      member: memberProfile,
    })
  }

  const { data: swimmers, error: sErr } = await supabase
    .from('swimmers')
    .select('id, first_name, last_name, status, squad_id, squads(name)')
    .eq('parent_id', parentId)
    .order('last_name')

  if (sErr) {
    console.error('fetchParentAccountContext swimmers:', sErr.message)
  }

  return {
    primary,
    submittedBy,
    isDelegateSubmit: Boolean(submittedById && submittedById !== parentId),
    emergency: {
      name: primary?.emergency_contact_name,
      relationship: primary?.emergency_contact_relationship,
      phone: primary?.emergency_contact_phone,
    },
    sharedAccess,
    swimmers: (swimmers || []).map((s) => ({
      id: s.id,
      name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      status: s.status,
      squadName: s.squads?.name || null,
    })),
  }
}
