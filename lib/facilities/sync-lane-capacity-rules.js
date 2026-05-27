/** Default swimmers per lane when auto-creating a rule for a squad slug. */
export const DEFAULT_SWIMMERS_PER_LANE = 6

/**
 * Keep lane_capacity_rules in sync with active squads (sub_squad = squad slug).
 * - Inserts missing rules for active squad slugs
 * - Removes rules for inactive or deleted squads
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ defaultPerLane?: number }} [options]
 * @returns {Promise<{ inserted: number, removed: number }>}
 */
export async function syncLaneCapacityRules(supabase, options = {}) {
  const defaultPerLane = options.defaultPerLane ?? DEFAULT_SWIMMERS_PER_LANE

  const { data: squads, error: squadsErr } = await supabase
    .from('squads')
    .select('slug')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (squadsErr) throw squadsErr

  const activeSlugs = (squads || []).map((s) => s.slug).filter(Boolean)

  const { data: rules, error: rulesErr } = await supabase
    .from('lane_capacity_rules')
    .select('sub_squad, swimmers_per_lane')

  if (rulesErr) throw rulesErr

  const activeSet = new Set(activeSlugs)
  let removed = 0
  let inserted = 0

  for (const rule of rules || []) {
    if (!activeSet.has(rule.sub_squad)) {
      const { error } = await supabase
        .from('lane_capacity_rules')
        .delete()
        .eq('sub_squad', rule.sub_squad)
      if (error) throw error
      removed += 1
    }
  }

  const existingSlugs = new Set((rules || []).map((r) => r.sub_squad))

  for (const slug of activeSlugs) {
    if (!existingSlugs.has(slug)) {
      const { error } = await supabase.from('lane_capacity_rules').insert({
        sub_squad: slug,
        swimmers_per_lane: defaultPerLane,
      })
      if (error) throw error
      inserted += 1
    }
  }

  return { inserted, removed }
}
