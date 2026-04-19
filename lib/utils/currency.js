import { calculateAge } from './date-helpers'

// Format amount to Kenyan Shillings
export function formatKES(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Fee constants ────────────────────────────────────────────────────────────

export const REGISTRATION_FEE = 3000        // annual, per swimmer
export const EARLY_BIRD_DISCOUNT = 2000     // deducted from monthly fee if paid by 3rd
export const OCCASIONAL_SWIMMER_RATE = 2000 // per drop-in class

// ── Session tier pricing ──────────────────────────────────────────────────────
// Keyed by sessions_per_week value stored on the swimmers table.
// Used for UI display on the registration form; fee source of truth for
// recurring invoices is the squad row in the database.
// quarterly: null means no quarterly option for that tier.
// Tier is independent of payment cadence — per-session billing is driven by
// `preferred_payment_type === 'per_session'`, not by the tier.

export const SESSION_TIER_PRICING = {
  '1-2': { label: '1–2 days/week', monthly: 7000,  quarterly: null },
  '1-4': { label: '1–4 days/week', monthly: 12000, quarterly: 30000 },
  '6':   { label: '6 days/week',   monthly: 14000, quarterly: 36000 },
}

/** Human-readable label for `swimmers.sessions_per_week` (parent registration choice). */
export function formatSessionsPerWeekLabel(sessionsPerWeek) {
  if (sessionsPerWeek == null || sessionsPerWeek === '') return '—'
  const tier = SESSION_TIER_PRICING[sessionsPerWeek]
  return tier?.label ?? String(sessionsPerWeek)
}

/** Human-readable label for `swimmers.preferred_payment_type`. */
export function formatPreferredPaymentTypeLabel(pref) {
  if (pref == null || pref === '') return '—'
  if (pref === 'monthly') return 'Monthly'
  if (pref === 'quarterly') return 'Quarterly'
  if (pref === 'per_session') return 'Pay per session'
  return String(pref)
}

// ── Squad pricing (legacy — kept for backward-compat with existing callers) ───
// Keys match the old hard-coded squad slugs. New code should read fees from
// the squads DB table via squad row. SESSION_TIER_PRICING is preferred for UI.

export const SQUAD_PRICING = {
  learn_to_swim: { monthly: 7000,  quarterly: null  },
  competitive:   { monthly: 12000, quarterly: 30000 },
  fitness:       { monthly: 14000, quarterly: 36000 },
}

// Squads that qualify for the early bird discount
export const EARLY_BIRD_SQUADS = ['competitive', 'fitness']

// ── Helper functions ─────────────────────────────────────────────────────────

// Returns true if today is on or before the 3rd of the month
export function isEarlyBirdEligible() {
  return new Date().getDate() <= 3
}

// Returns whether a squad has a quarterly payment option
export function hasQuarterlyOption(squad) {
  return !!SQUAD_PRICING[squad]?.quarterly
}

// Returns the quarterly saving for a squad vs paying 3x monthly
export function getQuarterlySaving(squad) {
  const pricing = SQUAD_PRICING[squad]
  if (!pricing?.quarterly) return 0
  return (pricing.monthly * 3) - pricing.quarterly
}

// ── Fee calculators ──────────────────────────────────────────────────────────

// Calculate registration fees (annual, per swimmer — unchanged)
export function calculateRegistrationFee(numberOfSwimmers) {
  return numberOfSwimmers * REGISTRATION_FEE
}

// Calculate training fee for a single swimmer
export function calculateTrainingFee(squad, paymentType = 'monthly', applyEarlyBird = false) {
  const pricing = SQUAD_PRICING[squad] || SQUAD_PRICING.competitive

  if (paymentType === 'quarterly') {
    // Fall back to 3x monthly if squad has no quarterly tier (shouldn't happen in UI but safe)
    return pricing.quarterly ?? pricing.monthly * 3
  }

  const base = pricing.monthly
  if (applyEarlyBird && EARLY_BIRD_SQUADS.includes(squad)) {
    return base - EARLY_BIRD_DISCOUNT
  }
  return base
}

// Full cost breakdown including:
//   - Annual registration fee for every swimmer
//   - Training fee per swimmer (per-squad, quarterly or monthly)
//   - Early bird discount on monthly fees (competitive + fitness only)
//   - 4th sibling free: training fee waived for the 4th swimmer onwards
export function calculateTotalRegistrationCost(swimmers, paymentType = 'monthly', applyEarlyBird = false) {
  const breakdown = swimmers.map((swimmer, index) => {
    const isFreeSwimmer = index >= 3 // 4th swimmer onwards — training fee waived
    const trainingFee = isFreeSwimmer
      ? 0
      : calculateTrainingFee(swimmer.squad, paymentType, applyEarlyBird)

    return {
      swimmerName: `${swimmer.firstName} ${swimmer.lastName}`,
      registrationFee: REGISTRATION_FEE,
      trainingFee,
      squad: swimmer.squad,
      earlyBirdApplied: !isFreeSwimmer && applyEarlyBird && EARLY_BIRD_SQUADS.includes(swimmer.squad),
      isFreeSwimmer,
    }
  })

  const registrationFees = swimmers.length * REGISTRATION_FEE
  const trainingFees = breakdown.reduce((sum, s) => sum + s.trainingFee, 0)

  return {
    registrationFees,
    trainingFees,
    total: registrationFees + trainingFees,
    breakdown,
  }
}

// Legacy alias — kept so any existing callers don't break immediately.
// Prefer calculateTrainingFee() for new code.
export function calculateMonthlyTrainingFee(squad, paymentType = 'monthly') {
  return calculateTrainingFee(squad, paymentType, false)
}

/**
 * Per-swimmer fee lines for the public registration form (camelCase swimmer fields).
 * Rules: under-6 annual reg waived + Pups 1–2 tier; 4th+ sibling training waived; SESSION_TIER_PRICING for tiers.
 * @returns {Array<{
 *   displayName: string,
 *   incomplete: boolean,
 *   registrationAmount: number | null,
 *   trainingLabel: string,
 *   trainingAmount: number | null,
 *   trainingPeriod: 'month' | 'quarter' | 'session' | null,
 *   isWaivedTraining: boolean,
 *   isDropIn: boolean,
 *   isUnderSix: boolean,
 *   trainingIncomplete: boolean,
 * }>}
 */
export function buildRegistrationFeeLines(swimmers) {
  if (!Array.isArray(swimmers)) return []

  return swimmers.map((swimmer, index) => {
    const displayName =
      [swimmer.firstName, swimmer.lastName].filter(Boolean).join(' ').trim() || `Swimmer ${index + 1}`

    if (!swimmer?.dateOfBirth) {
      return {
        displayName,
        incomplete: true,
        registrationAmount: null,
        trainingLabel: 'Complete date of birth and training choices above',
        trainingAmount: null,
        trainingPeriod: null,
        isWaivedTraining: false,
        isDropIn: false,
        isUnderSix: false,
        trainingIncomplete: true,
      }
    }

    const age = calculateAge(swimmer.dateOfBirth)
    const underSix = age < 6
    const isFourthPlus = index >= 3

    const registrationAmount = underSix ? 0 : REGISTRATION_FEE

    if (isFourthPlus) {
      return {
        displayName,
        incomplete: false,
        registrationAmount,
        trainingLabel: 'Training (waived — 4th sibling onward)',
        trainingAmount: 0,
        trainingPeriod: null,
        isWaivedTraining: true,
        isDropIn: false,
        isUnderSix: underSix,
        trainingIncomplete: false,
      }
    }

    if (underSix) {
      const tier = SESSION_TIER_PRICING['1-2']
      return {
        displayName,
        incomplete: false,
        registrationAmount,
        trainingLabel: `${tier.label} (Pups)`,
        trainingAmount: tier.monthly,
        trainingPeriod: 'month',
        isWaivedTraining: false,
        isDropIn: false,
        isUnderSix: true,
        trainingIncomplete: false,
      }
    }

    if (!swimmer.sessionsPerWeek) {
      return {
        displayName,
        incomplete: false,
        registrationAmount,
        trainingLabel: 'Select training frequency above',
        trainingAmount: null,
        trainingPeriod: null,
        isWaivedTraining: false,
        isDropIn: false,
        isUnderSix: false,
        trainingIncomplete: true,
      }
    }

    const tier = SESSION_TIER_PRICING[swimmer.sessionsPerWeek]
    if (!tier) {
      return {
        displayName,
        incomplete: true,
        registrationAmount,
        trainingLabel: 'Unknown tier',
        trainingAmount: null,
        trainingPeriod: null,
        isWaivedTraining: false,
        isDropIn: false,
        isUnderSix: false,
        trainingIncomplete: true,
      }
    }

    if (swimmer.preferredPaymentType === 'per_session') {
      return {
        displayName,
        incomplete: false,
        registrationAmount,
        trainingLabel: `${tier.label} — billed per attended session`,
        trainingAmount: OCCASIONAL_SWIMMER_RATE,
        trainingPeriod: 'session',
        isWaivedTraining: false,
        isDropIn: true,
        isUnderSix: false,
        trainingIncomplete: false,
      }
    }

    const wantQuarterly =
      swimmer.preferredPaymentType === 'quarterly' && tier.quarterly != null

    if (wantQuarterly) {
      return {
        displayName,
        incomplete: false,
        registrationAmount,
        trainingLabel: `${tier.label} (quarterly)`,
        trainingAmount: tier.quarterly,
        trainingPeriod: 'quarter',
        isWaivedTraining: false,
        isDropIn: false,
        isUnderSix: false,
        trainingIncomplete: false,
      }
    }

    return {
      displayName,
      incomplete: false,
      registrationAmount,
      trainingLabel: `${tier.label} (monthly)`,
      trainingAmount: tier.monthly,
      trainingPeriod: 'month',
      isWaivedTraining: false,
      isDropIn: false,
      isUnderSix: false,
      trainingIncomplete: false,
    }
  })
}

/** Sum of one-time annual registration fees for a fee line list (null-safe). */
export function sumRegistrationFeesFromLines(lines) {
  return lines.reduce((sum, line) => {
    if (line.registrationAmount == null) return sum
    return sum + line.registrationAmount
  }, 0)
}
