import { getDueDateAfterIssue, getMonthlyPeriodKey } from '@/lib/billing/period-keys'
import { hasBillingLineForPeriod } from '@/lib/billing/invoice-period-dedupe'
import {
  getRegistrationSwimYearLabel,
  getSwimQuarterKey,
  getSwimYearLabel,
} from '@/lib/billing/swim-year'
import {
  getSiblingIndex,
  isFourthPlusSibling,
  normalizeSquadRow,
  registrationFeeAmount,
  resolvePaymentType,
  trainingFeeFromSquadRow,
} from '@/lib/billing/swimmer-fee-rules'
import { issueInvoiceNotifications } from '@/lib/invoices/issue-invoice-notifications'
import { formatInClubTz } from '@/lib/billing/billing-timezone'

const SWIMMER_SELECT = `
  id, first_name, last_name, parent_id, squad_id, status,
  date_of_birth, preferred_payment_type,
  squads ( id, name, monthly_fee, quarterly_fee, early_bird_eligible )
`

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} swimmerId
 */
async function loadSwimmer(supabase, swimmerId) {
  const { data, error } = await supabase
    .from('swimmers')
    .select(SWIMMER_SELECT)
    .eq('id', swimmerId)
    .single()
  if (error || !data) return { error: error?.message || 'Swimmer not found' }
  if (data.status !== 'approved') return { error: 'Swimmer not approved' }
  if (!data.parent_id) return { error: 'No parent linked' }
  if (!data.squad_id) return { error: 'No squad assigned' }
  return { swimmer: data }
}

async function loadSiblings(supabase, parentId) {
  const { data, error } = await supabase
    .from('swimmers')
    .select('id')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) return { error: error.message }
  return { siblings: data || [] }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function insertIssuedInvoice(supabase, {
  swimmer,
  lineItems,
  issueDate = new Date(),
}) {
  const dueDate = getDueDateAfterIssue(issueDate)

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      parent_id: swimmer.parent_id,
      swimmer_id: swimmer.id,
      status: 'issued',
      total_amount: 0,
      payment_method: 'paystack',
      due_date: dueDate,
    })
    .select()
    .single()

  if (invErr || !invoice) {
    return { error: invErr?.message || 'Failed to create invoice' }
  }

  const items = lineItems.map((li) => ({ ...li, invoice_id: invoice.id }))
  const { error: liErr } = await supabase.from('invoice_line_items').insert(items)
  if (liErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: liErr.message }
  }

  await issueInvoiceNotifications(supabase, {
    invoiceId: invoice.id,
    parentId: swimmer.parent_id,
    swimmerId: swimmer.id,
    swimmerFirstName: swimmer.first_name,
    dueDateIso: dueDate,
  })

  return { success: true, invoiceId: invoice.id }
}

/**
 * Monthly training invoice for one swimmer (25th cron).
 */
export async function createMonthlyTrainingInvoice(supabase, swimmerId, issueDate = new Date()) {
  const loaded = await loadSwimmer(supabase, swimmerId)
  if (loaded.error) return { error: loaded.error, skipped: true }
  const swimmer = loaded.swimmer

  const { isDropIn } = resolvePaymentType(swimmer)
  if (isDropIn || swimmer.preferred_payment_type !== 'monthly') {
    return { skipped: true, reason: 'not_monthly' }
  }

  const sib = await loadSiblings(supabase, swimmer.parent_id)
  if (sib.error) return { error: sib.error }
  if (isFourthPlusSibling(getSiblingIndex(sib.siblings, swimmerId))) {
    return { skipped: true, reason: 'fourth_sibling' }
  }

  const period = getMonthlyPeriodKey(issueDate)
  if (await hasBillingLineForPeriod(supabase, swimmerId, 'monthly_training', period)) {
    return { skipped: true, reason: 'already_billed' }
  }

  const squad = normalizeSquadRow(swimmer.squads)
  const amount = trainingFeeFromSquadRow(squad, 'monthly', false)
  const swimYear = getSwimYearLabel(issueDate)
  const monthLabel = formatInClubTz(issueDate, 'MMMM yyyy')

  return insertIssuedInvoice(supabase, {
    swimmer,
    issueDate,
    lineItems: [
      {
        description: `Monthly Training Fee: ${swimmer.first_name} ${swimmer.last_name} (${squad?.name || 'Squad'}) — ${monthLabel} (${swimYear} season)`,
        amount,
        quantity: 1,
        fee_type: 'monthly_training',
        payment_period: period,
      },
    ],
  })
}

/**
 * Quarterly training invoice (25th on Sep / Dec / Mar / Jun).
 */
export async function createQuarterlyTrainingInvoice(supabase, swimmerId, issueDate = new Date()) {
  const loaded = await loadSwimmer(supabase, swimmerId)
  if (loaded.error) return { error: loaded.error, skipped: true }
  const swimmer = loaded.swimmer

  const { isDropIn } = resolvePaymentType(swimmer)
  if (isDropIn || swimmer.preferred_payment_type !== 'quarterly') {
    return { skipped: true, reason: 'not_quarterly' }
  }

  const sib = await loadSiblings(supabase, swimmer.parent_id)
  if (sib.error) return { error: sib.error }
  if (isFourthPlusSibling(getSiblingIndex(sib.siblings, swimmerId))) {
    return { skipped: true, reason: 'fourth_sibling' }
  }

  const period = getSwimQuarterKey(issueDate)
  if (!period) return { skipped: true, reason: 'not_quarter_month' }

  if (await hasBillingLineForPeriod(supabase, swimmerId, 'quarterly_training', period)) {
    return { skipped: true, reason: 'already_billed' }
  }

  const squad = normalizeSquadRow(swimmer.squads)
  const amount = trainingFeeFromSquadRow(squad, 'quarterly', false)

  return insertIssuedInvoice(supabase, {
    swimmer,
    issueDate,
    lineItems: [
      {
        description: `Quarterly Training Fee: ${swimmer.first_name} ${swimmer.last_name} (${squad?.name || 'Squad'}) — ${period}`,
        amount,
        quantity: 1,
        fee_type: 'quarterly_training',
        payment_period: period,
      },
    ],
  })
}

/**
 * Annual registration renewal (25 August — upcoming swim year).
 */
export async function createAnnualRegistrationInvoice(supabase, swimmerId, issueDate = new Date()) {
  const loaded = await loadSwimmer(supabase, swimmerId)
  if (loaded.error) return { error: loaded.error, skipped: true }
  const swimmer = loaded.swimmer

  const period = getRegistrationSwimYearLabel(issueDate)
  if (await hasBillingLineForPeriod(supabase, swimmerId, 'registration', period)) {
    return { skipped: true, reason: 'already_billed' }
  }

  const amount = registrationFeeAmount(swimmer.date_of_birth)
  const underSix = amount === 0 && swimmer.date_of_birth

  return insertIssuedInvoice(supabase, {
    swimmer,
    issueDate,
    lineItems: [
      {
        description: `Annual Registration: ${swimmer.first_name} ${swimmer.last_name} (${period} season)${underSix ? ' (Under 6, waived)' : ''}`,
        amount,
        quantity: 1,
        fee_type: 'registration',
        payment_period: period,
      },
    ],
  })
}
