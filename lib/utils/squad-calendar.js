/**
 * Squad colours for react-big-calendar on admin sessions (matches globals.css .rbc-squad-*).
 * Resolve by DB slug first; optional name fallback when slug missing.
 */

export const SQUAD_CALENDAR_PALETTE = {
  elite: {
    cssClass: 'rbc-squad-elite',
    bg: '#0ea5e9',
    fg: '#ffffff',
    accent: '#0369a1',
  },
  pups: {
    cssClass: 'rbc-squad-pups',
    bg: '#22c55e',
    fg: '#ffffff',
    accent: '#15803d',
  },
  development: {
    cssClass: 'rbc-squad-development',
    bg: '#a855f7',
    fg: '#ffffff',
    accent: '#7e22ce',
  },
  masters: {
    cssClass: 'rbc-squad-masters',
    bg: '#f59e0b',
    fg: '#1f2937',
    accent: '#b45309',
  },
  default: {
    cssClass: 'rbc-squad-default',
    bg: '#6b7280',
    fg: '#ffffff',
    accent: '#374151',
  },
}

/** Map legacy or alternate slugs to canonical palette keys */
const SLUG_ALIASES = {
  learn_to_swim: 'pups',
  learn2swim: 'pups',
  fitness: 'masters',
  competitive: 'elite',
}

function paletteKeyFromSlug(slug) {
  if (!slug || typeof slug !== 'string') return null
  const raw = slug.trim().toLowerCase()
  if (!raw) return null
  const aliased = SLUG_ALIASES[raw] ?? raw
  if (!SQUAD_CALENDAR_PALETTE[aliased] || aliased === 'default') return null
  return aliased
}

/**
 * Infer canonical key from display name when slug is missing (avoid mangling "Development (1–3)" into development13).
 */
function paletteKeyFromName(name) {
  if (!name || typeof name !== 'string') return null
  const n = name.toLowerCase()
  if (n.includes('pup')) return 'pups'
  if (n.includes('master')) return 'masters'
  if (n.includes('development')) return 'development'
  if (n.includes('elite')) return 'elite'
  return null
}

/**
 * @param {{ slug?: string, name?: string } | null | undefined} squadRow
 * @returns {'elite'|'pups'|'development'|'masters'|null}
 */
export function resolveCanonicalSquadKey(squadRow) {
  if (!squadRow) return null
  const fromSlug = paletteKeyFromSlug(squadRow.slug)
  if (fromSlug) return fromSlug
  return paletteKeyFromName(squadRow.name)
}

function getFirstSquadRowFromSession(session) {
  const rows = session?.training_session_squads ?? []
  return rows[0]?.squads ?? null
}

/** CSS class for calendar chips (and legend) */
export function getSquadCalendarClassName(session) {
  const row = getFirstSquadRowFromSession(session)
  const key = resolveCanonicalSquadKey(row)
  const paletteKey = key && SQUAD_CALENDAR_PALETTE[key] ? key : 'default'
  return SQUAD_CALENDAR_PALETTE[paletteKey].cssClass
}

/** Inline styles so agenda/month views keep background if library CSS overrides classes */
export function getSquadCalendarEventProps(session) {
  const row = getFirstSquadRowFromSession(session)
  const key = resolveCanonicalSquadKey(row)
  const paletteKey = key && SQUAD_CALENDAR_PALETTE[key] ? key : 'default'
  const p = SQUAD_CALENDAR_PALETTE[paletteKey]

  return {
    className: `rbc-event-custom ${p.cssClass}`.trim(),
    style: {
      backgroundColor: p.bg,
      color: p.fg,
      border: 'none',
      borderRadius: '4px',
      borderLeft: `4px solid ${p.accent}`,
      padding: '2px 6px',
      fontSize: '0.75rem',
    },
  }
}
