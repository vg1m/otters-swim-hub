import { EARLY_BIRD_DISCOUNT } from '@/lib/utils/currency'
import { isInEarlyBirdWindow } from '@/lib/billing/early-bird-window'

/** Normalize FK embed — PostgREST can return object or single-element array. */
function firstEmb(row) {
  if (row == null) return null
  return Array.isArray(row) ? row[0] ?? null : row
}

/**
 * @returns {boolean} Whether the swimmer's squad row allows early bird at payment time.
 */
export function invoiceSwimmerSquadEarlyBirdEligible(swimmersEmbed) {
  const swimmer = firstEmb(swimmersEmbed)
  if (!swimmer) return false
  const squad = firstEmb(swimmer.squads)
  return squad?.early_bird_eligible === true
}

/**
 * Onboarding invoices created inside the calendar window bake the reduction into the
 * monthly_training line (+ description "(Early Bird)"). Charging must not subtract again.
 */
export function monthlyEarlyBirdAlreadyInLineItems(lineItems) {
  return (
    lineItems?.some(
      (item) =>
        item?.fee_type === 'monthly_training' &&
        /\(Early\s*Bird\)/i.test(String(item.description || ''))
    ) ?? false
  )
}

function isOnboardingInvoice(lineItems) {
  if (!lineItems?.length) return false
  const hasRegistration = lineItems.some((item) => item.fee_type === 'registration')
  const hasTraining = lineItems.some((item) =>
    ['monthly_training', 'quarterly_training'].includes(item.fee_type)
  )
  return hasRegistration && hasTraining
}

/**
 * Computes KES to charge plus discount metadata (matches parent invoices UI).
 *
 * @param {object} invoice — row with invoice_line_items, swimmers embed, total_amount, created_at
 * @param {Date} [referenceDate]
 */
export function computeInvoiceEarlyBirdPayAdjustments(invoice, referenceDate = new Date()) {
  const total = Number(invoice.total_amount ?? 0)
  const lineItems = invoice.invoice_line_items ?? []
  const hasMonthlyTraining = lineItems.some((item) => item.fee_type === 'monthly_training')
  const squadEligible = invoiceSwimmerSquadEarlyBirdEligible(invoice.swimmers)
  const embeddedAtCreation = monthlyEarlyBirdAlreadyInLineItems(lineItems)

  const issuedAt = invoice.created_at ? new Date(invoice.created_at) : new Date()
  const onboarding = isOnboardingInvoice(lineItems)

  const inWindow = isInEarlyBirdWindow(referenceDate, {
    invoiceIssuedAt: issuedAt,
    isOnboarding: onboarding,
  })

  const subtract = inWindow && hasMonthlyTraining && squadEligible && !embeddedAtCreation

  const discount = subtract ? EARLY_BIRD_DISCOUNT : 0
  const chargedAmount = Math.max(0, total - discount)

  return {
    chargedAmount,
    earlyBirdApplied: subtract,
    earlyBirdDiscount: discount,
  }
}
