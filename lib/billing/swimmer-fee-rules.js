import { EARLY_BIRD_DISCOUNT, REGISTRATION_FEE } from '@/lib/utils/currency'
import { calculateAge } from '@/lib/utils/date-helpers'

export function normalizeSquadRow(squadsEmbed) {
  if (!squadsEmbed) return null
  return Array.isArray(squadsEmbed) ? squadsEmbed[0] ?? null : squadsEmbed
}

/**
 * Training fee from squad row (full rate; early bird applied at payment time only).
 */
export function trainingFeeFromSquadRow(squadRow, paymentType, applyEarlyBird = false) {
  if (!squadRow) return 0
  const monthly = Number(squadRow.monthly_fee)
  const quarterly =
    squadRow.quarterly_fee != null && squadRow.quarterly_fee !== ''
      ? Number(squadRow.quarterly_fee)
      : null

  if (paymentType === 'quarterly') {
    return quarterly != null ? quarterly : monthly * 3
  }

  let base = monthly
  if (applyEarlyBird && squadRow.early_bird_eligible) {
    base -= EARLY_BIRD_DISCOUNT
  }
  return Math.max(0, base)
}

/**
 * @param {Array<{ id: string }>} siblingsOrderedByCreatedAt
 * @param {string} swimmerId
 */
export function getSiblingIndex(siblingsOrderedByCreatedAt, swimmerId) {
  return siblingsOrderedByCreatedAt.findIndex((s) => s.id === swimmerId)
}

export function isFourthPlusSibling(siblingIndex) {
  return siblingIndex >= 3
}

export function registrationFeeAmount(dateOfBirth) {
  const age = calculateAge(dateOfBirth)
  return age < 6 ? 0 : REGISTRATION_FEE
}

export function resolvePaymentType(swimmer, paymentTypeOverride) {
  const isDropIn = swimmer.preferred_payment_type === 'per_session'
  const resolved = isDropIn
    ? 'monthly'
    : (paymentTypeOverride ?? swimmer.preferred_payment_type ?? 'monthly')
  return { isDropIn, resolvedPaymentType: resolved }
}
