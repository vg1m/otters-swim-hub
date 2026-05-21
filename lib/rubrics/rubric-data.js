/**
 * Static rubric data mirroring the seed in migration 073_squad_rubrics.sql.
 *
 * Used by UI components to render the rubric template without a DB round-trip
 * for the structure itself (only ratings need to be fetched from the DB).
 *
 * Rating scale:
 *   Skills / Habits:  1 = Not yet introduced, 2 = Learning, 3 = Consistent, 4 = Mastered, null = N/A
 *   Attitude (coach + self-report): 1–5
 */

export const RATING_LABELS = {
  1: 'Not yet introduced',
  2: 'Learning',
  3: 'Consistent',
  4: 'Mastered',
}

export const ATTITUDE_LABELS = {
  1: 'Very unhappy',
  2: 'Unhappy',
  3: 'Neutral',
  4: 'Happy',
  5: 'Very happy',
}

/**
 * @typedef {{ domain: string, milestones: string[] }} RubricDomain
 * @typedef {{ name: string, ageRange: string, sections: { skills: RubricDomain[], habits: RubricDomain[] } }} RubricLevel
 */

/** @type {Record<string, RubricLevel>} */
export const RUBRIC_DATA = {
  pups: {
    name: 'Pups',
    ageRange: 'Ages 5–6',
    sections: {
      skills: [
        {
          domain: 'Water confidence & safety',
          milestones: [
            'Enters the pool without distress',
            'Submerges face and blows bubbles for 3 or more seconds',
            'Front float unassisted for 5 seconds',
            'Back float unassisted for 5 seconds',
            'Turns from front to back and back to front',
            'Safe pool entry and exit (ladder or steps)',
          ],
        },
        {
          domain: 'Freestyle (introduction)',
          milestones: [
            'Flutter kick with board across the pool',
            'Freestyle arm action with face in water over short distance',
            '10m unassisted freestyle',
          ],
        },
        {
          domain: 'Backstroke (introduction)',
          milestones: [
            'Back kick with board across the pool',
            '10m unassisted backstroke',
          ],
        },
      ],
      habits: [
        {
          domain: 'Training behaviours',
          milestones: [
            'Listens to and follows coach instructions',
            'Waits at the wall until told to go',
            'Attends sessions regularly',
          ],
        },
      ],
    },
  },

  dev1: {
    name: 'Development 1',
    ageRange: 'Ages 7–8',
    sections: {
      skills: [
        {
          domain: 'Water skills',
          milestones: [
            'Treading water for 30 seconds',
            'Underwater streamline glide for 5m off the wall',
            'Confident diving entry from sitting on the side',
          ],
        },
        {
          domain: 'Freestyle',
          milestones: [
            '25m continuous with side breathing',
            'Flutter kick with pointed toes and straight legs',
            'Catch with fingers angled down',
            'Breathing every 3 strokes attempted',
          ],
        },
        {
          domain: 'Backstroke',
          milestones: [
            '25m continuous staying on back',
            'Flutter kick with pointed toes',
            'Arms pass close to the ears on recovery',
            'Eyes to the ceiling',
          ],
        },
        {
          domain: 'Breaststroke (introduction)',
          milestones: [
            'Whip kick with board over 25m (heels to seat, feet turn out)',
            'Timing concept: pull – breathe – kick – glide',
          ],
        },
        {
          domain: 'Butterfly (kick only)',
          milestones: [
            'Dolphin kick on front for 10m',
            'Dolphin kick on back for 10m',
          ],
        },
        {
          domain: 'Starts & turns (introduction)',
          milestones: [
            'Push off in streamline on front',
            'Push off in streamline on back',
            'Touch turn awareness (two-hand touch concept)',
          ],
        },
      ],
      habits: [
        {
          domain: 'Training behaviours',
          milestones: [
            '75% or higher attendance',
            'Follows set instructions without repetition',
            'Lane etiquette: single file, touching feet',
          ],
        },
      ],
    },
  },

  dev2: {
    name: 'Development 2',
    ageRange: 'Ages 8–9',
    sections: {
      skills: [
        {
          domain: 'Freestyle',
          milestones: [
            '50m continuous',
            'Bilateral breathing attempted (every 3 strokes)',
            'S-shaped pull pattern',
            'High elbow recovery',
          ],
        },
        {
          domain: 'Backstroke',
          milestones: [
            '50m continuous',
            'Fast, straight legs (six-beat kick)',
            'Hip rotation beginning',
            'Steady arm tempo',
          ],
        },
        {
          domain: 'Breaststroke',
          milestones: [
            '50m continuous',
            'Legal whip kick',
            'Pull only to under the chin (not past shoulders)',
            'Timing consistent over full 50m',
          ],
        },
        {
          domain: 'Butterfly',
          milestones: [
            '25m fly with two breaths',
            'Arms recover over the water',
            'Two dolphin kicks per arm cycle',
          ],
        },
        {
          domain: 'Starts, turns & finishes',
          milestones: [
            'Grab start from the block (introduction)',
            'Open turn with two-hand touch (breaststroke and fly)',
            'Streamline off every wall',
            'Finish on a full stroke, not a glide',
          ],
        },
      ],
      habits: [
        {
          domain: 'Training behaviours',
          milestones: [
            'Can read a 60-second pace clock',
            'Follows short interval sets (e.g. 3 x 50 on 1:30)',
            '85% or higher attendance',
          ],
        },
      ],
    },
  },

  dev3: {
    name: 'Development 3',
    ageRange: 'Ages 10–11',
    sections: {
      skills: [
        {
          domain: 'Freestyle',
          milestones: [
            '100m at training pace',
            'Flip turn with streamline push-off',
            'Bilateral breathing consistent',
            'Strong kick across the full 100m',
          ],
        },
        {
          domain: 'Backstroke',
          milestones: [
            '100m continuous at training pace',
            'Backstroke flip turn',
            'Uses backstroke flags to judge wall approach',
            'Legal finish on the back',
          ],
        },
        {
          domain: 'Breaststroke',
          milestones: [
            '100m at training pace',
            'Legal two-hand simultaneous touch',
            'One full pullout off the wall (one pull + one kick, surface)',
          ],
        },
        {
          domain: 'Butterfly',
          milestones: [
            '25m fly continuous',
            'Legal two-hand touch finish',
          ],
        },
        {
          domain: 'Starts, turns & finishes',
          milestones: [
            'Legal grab or track start from the block',
            'Flip turn in freestyle',
            'Backstroke flip turn',
            'Breaststroke and butterfly touch turn',
          ],
        },
      ],
      habits: [
        {
          domain: 'Race skills',
          milestones: [
            'Understands the false-start rule',
            'Race routine: warm-up, marshalling, behind the blocks',
            'Understands race-pace vs training-pace',
          ],
        },
        {
          domain: 'Training behaviours',
          milestones: [
            'Uses pace clock independently',
            'Logs own training times when asked',
            '85% or higher attendance',
          ],
        },
      ],
    },
  },

  bronze: {
    name: 'Bronze',
    ageRange: 'Ages 11–13',
    sections: {
      skills: [
        {
          domain: 'Freestyle',
          milestones: [
            '200m at steady training pace with even tempo',
            'Distance-per-stroke awareness',
            'Strong consistent kick across the set',
          ],
        },
        {
          domain: 'Backstroke',
          milestones: [
            '100m at race pace',
            'Consistent stroke count per 25m',
            'Three or more underwater dolphins off each wall',
          ],
        },
        {
          domain: 'Breaststroke',
          milestones: [
            '100m at race pace',
            'Clean pullout connecting to first stroke',
            'Uses the two kicks per pull permitted for breakouts',
          ],
        },
        {
          domain: 'Butterfly',
          milestones: [
            '50m at race pace',
            'Two breaths per 25m',
            'Rhythm between arms and kick maintained',
          ],
        },
        {
          domain: 'Individual medley',
          milestones: [
            '100m IM with legal transitions between all four strokes',
          ],
        },
        {
          domain: 'Starts, turns & finishes',
          milestones: [
            'Race dive with streamline and clean break-out',
            'Quick reaction to the starter',
            'Wall contact on turns under 1.5 seconds',
          ],
        },
      ],
      habits: [
        {
          domain: 'Race skills',
          milestones: [
            'Consistent race routine',
            'Understands heats and finals format',
            'Reads split times',
          ],
        },
        {
          domain: 'Training',
          milestones: [
            'Pace clock fluency: leaving and returning on interval',
            'Punctual and arrives prepared',
            '90% or higher attendance',
          ],
        },
        {
          domain: 'Recovery & wellbeing',
          milestones: [
            'Hydration habits established',
            'Reports soreness or injury to coach early',
            'Understands importance of sleep',
          ],
        },
      ],
    },
  },

  silver: {
    name: 'Silver',
    ageRange: 'Ages 12–14',
    sections: {
      skills: [
        {
          domain: 'Freestyle',
          milestones: [
            '400m test set to a target time',
            'Descending sets: each repeat faster than the last',
            'Sprint mechanics for 50m and 100m events',
          ],
        },
        {
          domain: 'Backstroke',
          milestones: [
            '200m at race pace',
            'Uses the 15m underwater rule off starts and turns',
            'Tight, consistent stroke count',
          ],
        },
        {
          domain: 'Breaststroke',
          milestones: [
            '200m at race pace',
            'Efficient pullout timing on every wall',
            'Holds rhythm under fatigue',
          ],
        },
        {
          domain: 'Butterfly',
          milestones: [
            '100m at race pace',
            'Consistent two-kicks-per-pull throughout',
            'Strong finish into the wall',
          ],
        },
        {
          domain: 'Individual medley',
          milestones: [
            '200m IM with legal, well-executed transitions',
            'Event-specific transition skills (e.g. back-to-breast rollover)',
          ],
        },
        {
          domain: 'Starts, turns & finishes',
          milestones: [
            'Wall contact under 1 second on turns',
            '5m or more of underwater streamline off each wall',
          ],
        },
      ],
      habits: [
        {
          domain: 'Race skills',
          milestones: [
            'Heat management: warm-up, nutrition, between swims',
            'Recovering mentally from a bad swim',
            'Visualisation basics',
          ],
        },
        {
          domain: 'Training',
          milestones: [
            'Holds target pace on long aerobic sets',
            'Engages with dry-land sessions',
          ],
        },
        {
          domain: 'Recovery & wellbeing',
          milestones: [
            'Tracks hydration and sleep',
            'Completes injury-prevention routines',
          ],
        },
        {
          domain: 'Event specialisation',
          milestones: [
            'Identified top two events',
            'Sets and reviews season goals with coach',
          ],
        },
      ],
    },
  },

  gold: {
    name: 'Gold',
    ageRange: 'By selection',
    sections: {
      skills: [
        {
          domain: 'Four strokes at senior race standard',
          milestones: [
            'Race times meeting or approaching national age-group standards',
            'Technical benchmarks per stroke in individual development plan',
          ],
        },
        {
          domain: 'Individual medley',
          milestones: [
            'IM as a core event, not a secondary one',
            "200m and 400m IM race standards per swimmer's plan",
          ],
        },
        {
          domain: 'Starts, turns & finishes',
          milestones: [
            'Measured on split times, not visual assessment',
            'Elite-level break-out speeds',
          ],
        },
      ],
      habits: [
        {
          domain: 'Race skills',
          milestones: [
            'Pacing plans held under race pressure',
            'Competition strategy for heats, semis, finals where applicable',
          ],
        },
        {
          domain: 'Training',
          milestones: [
            'Holds targeted paces over periodised blocks',
            'High-intensity training capacity',
          ],
        },
        {
          domain: 'Recovery & wellbeing',
          milestones: [
            'Self-manages training load with coach guidance',
            'Pre-habilitation routines completed independently',
            'Nutrition practice aligned with training demands',
          ],
        },
        {
          domain: 'Strength & conditioning',
          milestones: [
            'Integrated dry-land programme executed fully',
            'Injury resilience: few or no training interruptions',
          ],
        },
        {
          domain: 'Event specialisation',
          milestones: [
            'Two to three main events with individualised training plans',
            'Secondary events maintained to relay standard',
          ],
        },
        {
          domain: 'Mental performance',
          milestones: [
            'Visualisation as a routine practice',
            'Race-day routines established',
            'Composure under pressure',
          ],
        },
      ],
    },
  },
}

/** Ordered list of rubric slugs for display/sorting. */
export const RUBRIC_SQUAD_ORDER = ['pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold']

/** Default static + DB clone source for custom squad slugs (e.g. development_3). */
export const DEFAULT_RUBRIC_TEMPLATE_SLUG = 'dev2'

/** Returns true if the squad slug has a defined rubric template (static). */
export function hasRubric(squadSlug) {
  return Boolean(squadSlug && RUBRIC_DATA[squadSlug])
}

/** Slug used for UI labels/structure; pathway squads use own slug, custom squads use dev2. */
export function resolveRubricDisplaySlug(squadSlug) {
  if (!squadSlug) return null
  if (hasRubric(squadSlug)) return squadSlug
  return DEFAULT_RUBRIC_TEMPLATE_SLUG
}

/**
 * Whether the Performance rubric tab should show for this swimmer's squad.
 * Requires admin-enabled flag; custom slugs rely on DB clone from dev2 (migration 076).
 * @param {{ slug?: string, rubrics_enabled?: boolean } | null | undefined} squad
 */
export function squadSupportsRubric(squad) {
  if (!squad?.slug) return false
  const enabled =
    squad.rubrics_enabled ?? PATHWAY_RUBRIC_SLUGS.has(squad.slug)
  return !!enabled
}

/** Slugs with pathway rubrics (for admin grouping). */
export const PATHWAY_RUBRIC_SLUGS = new Set(RUBRIC_SQUAD_ORDER)

/**
 * Build grouped squad options for admin swimmer assignment.
 * @param {Array<{ id: string, name: string, slug: string, rubrics_enabled?: boolean }>} squads
 */
export function buildGroupedSquadSelectOptions(squads) {
  const pathway = []
  const other = []
  for (const s of squads || []) {
    const opt = { value: s.id, label: s.name }
    if (PATHWAY_RUBRIC_SLUGS.has(s.slug) || s.rubrics_enabled) {
      pathway.push(opt)
    } else {
      other.push(opt)
    }
  }
  const options = [{ value: '', label: 'Not assigned yet' }]
  if (pathway.length) {
    options.push({ value: '__pathway__', label: '—— Pathway squads (rubrics) ——', disabled: true })
    options.push(...pathway)
  }
  if (other.length) {
    options.push({ value: '__other__', label: '—— Other squads ——', disabled: true })
    options.push(...other)
  }
  return options
}
