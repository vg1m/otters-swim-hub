import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  isActiveSwimMonth,
  isAnnualRegistrationBillingDay,
  isBillingDayOfMonth,
  isQuarterlyBillingMonth,
} from '@/lib/billing/swim-year'
import {
  createAnnualRegistrationInvoice,
  createMonthlyTrainingInvoice,
  createQuarterlyTrainingInvoice,
} from '@/lib/invoices/create-recurring-invoice'

/**
 * Vercel Cron (25th 03:00 UTC ≈ 06:00 EAT): monthly training (Sep–Jul),
 * quarterly (Sep/Dec/Mar/Jun), annual registration (25 Aug only).
 *
 * @param {Date} [issueDate]
 * @param {{ force?: boolean }} [options] — `force: true` skips the “must be 25th” guard (simulation only)
 */
export async function runRecurringBillingJob(issueDate = new Date(), options = {}) {
  const { force = false } = options

  if (!force && !isBillingDayOfMonth(issueDate)) {
    return {
      ok: true,
      skipped: true,
      reason: 'not_billing_day',
      issueDate: issueDate.toISOString(),
      simulated: false,
    }
  }

  const supabase = createServiceRoleClient()
  const { data: swimmers, error: listErr } = await supabase
    .from('swimmers')
    .select('id')
    .eq('status', 'approved')
    .not('parent_id', 'is', null)
    .not('squad_id', 'is', null)

  if (listErr) {
    console.error('recurring-billing: swimmers', listErr)
    return { ok: false, error: listErr.message, simulated: force }
  }

  const runRegistration = isAnnualRegistrationBillingDay(issueDate)
  const runQuarterly = isQuarterlyBillingMonth(issueDate)
  const runMonthly = isActiveSwimMonth(issueDate)

  const stats = {
    swimmers: swimmers?.length ?? 0,
    monthlyCreated: 0,
    quarterlyCreated: 0,
    registrationCreated: 0,
    skipped: 0,
    errors: [],
    batches: {
      registration: runRegistration,
      quarterly: runQuarterly,
      monthly: runMonthly,
    },
  }

  for (const row of swimmers || []) {
    if (runRegistration) {
      const res = await createAnnualRegistrationInvoice(supabase, row.id, issueDate)
      if (res.success) stats.registrationCreated += 1
      else if (res.error) stats.errors.push({ swimmerId: row.id, type: 'registration', error: res.error })
      else if (res.skipped) stats.skipped += 1
    }

    if (runQuarterly) {
      const res = await createQuarterlyTrainingInvoice(supabase, row.id, issueDate)
      if (res.success) stats.quarterlyCreated += 1
      else if (res.error) stats.errors.push({ swimmerId: row.id, type: 'quarterly', error: res.error })
      else if (res.skipped) stats.skipped += 1
    }

    if (runMonthly) {
      const res = await createMonthlyTrainingInvoice(supabase, row.id, issueDate)
      if (res.success) stats.monthlyCreated += 1
      else if (res.error) stats.errors.push({ swimmerId: row.id, type: 'monthly', error: res.error })
      else if (res.skipped) stats.skipped += 1
    }
  }

  return {
    ok: true,
    ...stats,
    issueDate: issueDate.toISOString(),
    simulated: force,
  }
}
