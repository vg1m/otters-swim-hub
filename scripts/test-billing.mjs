/**
 * Lightweight billing logic checks (no Supabase).
 * Run: npm run test:billing
 */
import assert from 'node:assert/strict'
import {
  getSwimYearLabel,
  getUpcomingSwimYearLabel,
  getRegistrationSwimYearLabel,
  getSwimQuarterKey,
  getSwimQuarterKeyForOnboarding,
  isActiveSwimMonth,
  isAnnualRegistrationBillingDay,
} from '../lib/billing/swim-year.js'
import {
  isInStandardEarlyBirdWindow,
  isOnboardingEarlyBirdGrace,
  isCurrentlyInEarlyBirdWindow,
} from '../lib/billing/early-bird-window.js'

const TZ = 'Africa/Nairobi'

function clubDate(y, m, d, h = 12) {
  return new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00+03:00`)
}

process.env.APP_TIMEZONE = TZ

assert.equal(getSwimYearLabel(clubDate(2026, 7, 15)), '2025-26')
assert.equal(getSwimYearLabel(clubDate(2026, 9, 1)), '2026-27')
assert.equal(getUpcomingSwimYearLabel(clubDate(2026, 8, 25)), '2026-27')
assert.equal(getRegistrationSwimYearLabel(clubDate(2025, 8, 25)), '2025-26')
assert.equal(getSwimQuarterKey(clubDate(2025, 12, 25)), '2025-26-Q2')
assert.equal(getSwimQuarterKeyForOnboarding(clubDate(2026, 5, 10)), '2025-26-Q3')
assert.equal(isActiveSwimMonth(clubDate(2026, 8, 25)), false)
assert.equal(isActiveSwimMonth(clubDate(2026, 9, 25)), true)
assert.equal(isAnnualRegistrationBillingDay(clubDate(2026, 8, 25)), true)
assert.equal(isAnnualRegistrationBillingDay(clubDate(2026, 9, 25)), false)

assert.equal(isInStandardEarlyBirdWindow(clubDate(2026, 5, 28), clubDate(2026, 5, 25)), true)
assert.equal(isInStandardEarlyBirdWindow(clubDate(2026, 6, 4), clubDate(2026, 5, 25)), false)
assert.equal(isInStandardEarlyBirdWindow(clubDate(2026, 6, 3), clubDate(2026, 5, 25)), true)
assert.equal(isOnboardingEarlyBirdGrace(clubDate(2026, 5, 20), clubDate(2026, 5, 10)), true)
assert.equal(isOnboardingEarlyBirdGrace(clubDate(2026, 6, 4), clubDate(2026, 5, 10)), false)
assert.equal(isCurrentlyInEarlyBirdWindow(clubDate(2026, 5, 26)), true)

console.log('All billing logic checks passed.')
