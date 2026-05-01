import { EARLY_BIRD_DISCOUNT } from '@/lib/utils/currency'

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

/**
 * Computes KES to charge plus discount metadata (matches parent invoices UI).
 *
 * @param {object} invoice — row with invoice_line_items, swimmers embed, total_amount
 * @param {Date} [referenceDate]
 */
export function computeInvoiceEarlyBirdPayAdjustments(invoice, referenceDate = new Date()) {
  const total = Number(invoice.total_amount ?? 0)
  const inCalendarWindow = referenceDate.getDate() <= 3
  const hasMonthlyTraining =
    invoice.invoice_line_items?.some((item) => item.fee_type === 'monthly_training') ?? false
  const squadEligible = invoiceSwimmerSquadEarlyBirdEligible(invoice.swimmers)
  const embeddedAtCreation = monthlyEarlyBirdAlreadyInLineItems(invoice.invoice_line_items)

  const subtract =
    inCalendarWindow && hasMonthlyTraining && squadEligible && !embeddedAtCreation

  const discount = subtract ? EARLY_BIRD_DISCOUNT : 0
  const chargedAmount = Math.max(0, total - discount)

  return {
    chargedAmount,
    /** True when we deduct EARLY_BIRD_DISCOUNT at checkout (not when already in line items). */
    earlyBirdApplied: subtract,
    earlyBirdDiscount: discount,
  }
}
