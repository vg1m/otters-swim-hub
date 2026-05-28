/**
 * Gated billing simulation (dev / explicit staging flag only).
 */

export function isBillingSimulateAllowed() {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.ALLOW_BILLING_SIMULATE === '1'
}

/**
 * Parse `YYYY-MM-DD` or `YYYY-MM` (uses the 25th in club-local noon EAT).
 * @param {string} input
 * @returns {Date | null}
 */
export function parseSimulateAsOf(input) {
  if (!input || typeof input !== 'string') return null
  const s = input.trim()
  const tzSuffix = '+03:00'

  if (/^\d{4}-\d{2}$/.test(s)) {
    return new Date(`${s}-25T12:00:00${tzSuffix}`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00${tzSuffix}`)
  }
  return null
}
