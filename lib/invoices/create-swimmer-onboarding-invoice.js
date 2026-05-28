import { calculateAge } from '@/lib/utils/date-helpers'
import { getDueDateAfterIssue, getMonthlyPeriodKey } from '@/lib/billing/period-keys'
import {
  getRegistrationSwimYearLabel,
  getSwimQuarterKeyForOnboarding,
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

export { trainingFeeFromSquadRow } from '@/lib/billing/swimmer-fee-rules'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - client with admin rights
 */
export async function createSwimmerOnboardingInvoice(supabase, {
  swimmerId,
  paymentType,
}) {
  const { data: swimmer, error: swErr } = await supabase
    .from('swimmers')
    .select(
      `
      id, first_name, last_name, parent_id, squad_id, status,
      date_of_birth, sessions_per_week, preferred_payment_type,
      squads ( id, name, monthly_fee, quarterly_fee, early_bird_eligible )
    `
    )
    .eq('id', swimmerId)
    .single()

  if (swErr || !swimmer) {
    return { error: swErr?.message || 'Swimmer not found' }
  }

  if (!swimmer.parent_id) {
    return { error: 'Parent account must be linked before creating an invoice.' }
  }

  if (!swimmer.squad_id || !swimmer.squads) {
    return { error: 'Assign a squad before creating an invoice.' }
  }

  if (swimmer.status !== 'approved') {
    return { error: 'Approve the swimmer before creating an invoice.' }
  }

  const { isDropIn, resolvedPaymentType } = resolvePaymentType(swimmer, paymentType)

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('swimmer_id', swimmerId)
    .in('status', ['draft', 'issued', 'due'])
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { error: 'An open invoice already exists for this swimmer.', invoiceId: existing.id }
  }

  const { data: siblings, error: sibErr } = await supabase
    .from('swimmers')
    .select('id')
    .eq('parent_id', swimmer.parent_id)
    .order('created_at', { ascending: true })

  if (sibErr) {
    return { error: sibErr.message }
  }

  const siblingIndex = getSiblingIndex(siblings || [], swimmerId)
  const isFreeSwimmer = isFourthPlusSibling(siblingIndex)
  const squad = normalizeSquadRow(swimmer.squads)
  const issueDate = new Date()

  const ageAtInvoice = calculateAge(swimmer.date_of_birth)
  const isUnderSix = ageAtInvoice < 6
  const registrationFeeAmountValue = registrationFeeAmount(swimmer.date_of_birth)
  const registrationPeriod = getRegistrationSwimYearLabel(issueDate)

  const trainingFee = (isFreeSwimmer || isDropIn)
    ? 0
    : trainingFeeFromSquadRow(squad, resolvedPaymentType, false)

  const monthlyPeriod = getMonthlyPeriodKey(issueDate)
  const quarterlyPeriod = getSwimQuarterKeyForOnboarding(issueDate)

  const dueDate = getDueDateAfterIssue(issueDate)

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      parent_id: swimmer.parent_id,
      swimmer_id: swimmerId,
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

  const squadLabel = squad?.name || 'Squad'
  const items = [
    {
      invoice_id: invoice.id,
      description: `Annual Registration: ${swimmer.first_name} ${swimmer.last_name} (${registrationPeriod} season)${isUnderSix ? ' (Under 6, waived)' : ''}`,
      amount: registrationFeeAmountValue,
      quantity: 1,
      fee_type: 'registration',
      payment_period: registrationPeriod,
    },
  ]

  if (!isDropIn) {
    let trainingDescription = `${resolvedPaymentType === 'quarterly' ? 'Quarterly' : 'Monthly'} Training Fee: ${swimmer.first_name} ${swimmer.last_name} (${squadLabel})`
    if (isFreeSwimmer) {
      trainingDescription += ' (4th sibling, free)'
    }

    items.push({
      invoice_id: invoice.id,
      description: trainingDescription,
      amount: trainingFee,
      quantity: 1,
      fee_type: resolvedPaymentType === 'quarterly' ? 'quarterly_training' : 'monthly_training',
      payment_period:
        resolvedPaymentType === 'quarterly' ? quarterlyPeriod : monthlyPeriod,
    })
  }

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
    sendEmail: false,
  })

  return { success: true, invoiceId: invoice.id }
}
