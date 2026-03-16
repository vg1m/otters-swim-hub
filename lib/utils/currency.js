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

export const REGISTRATION_FEE = 3500        // annual, per swimmer
export const EARLY_BIRD_DISCOUNT = 2000     // deducted from monthly fee if paid by 3rd
export const OCCASIONAL_SWIMMER_RATE = 2000 // per drop-in class

// ── Squad pricing ────────────────────────────────────────────────────────────
// Keys match the squad values used in the swimmers table and registration form.
// quarterly: null means the squad does not have a quarterly option.

export const SQUAD_PRICING = {
  learn_to_swim: { monthly: 7000,  quarterly: null  },  // 1-2 sessions/week (Pups)
  competitive:   { monthly: 12000, quarterly: 30000 },  // 1-4 sessions/week
  fitness:       { monthly: 14000, quarterly: 36000 },  // Mon–Sat, 1-6 sessions/week
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
