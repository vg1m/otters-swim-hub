import {
  REGISTRATION_FEE,
  EARLY_BIRD_DISCOUNT,
  isEarlyBirdEligible,
} from '@/lib/utils/currency'
import { calculateAge } from '@/lib/utils/date-helpers'

/**
 * Admin-only: create an issued invoice (registration + training) for an approved swimmer.
 * Expects swimmer to have parent_id, squad_id, and squad row joined.
 */
export function trainingFeeFromSquadRow(squadRow, paymentType, applyEarlyBird) {
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
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - client with admin rights
 */
export async function createSwimmerOnboardingInvoice(supabase, {
  swimmerId,
  paymentType,           // explicit override; falls back to swimmer.preferred_payment_type
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

  // Resolve payment type: explicit arg > swimmer preference > monthly default.
  // Per-session swimmers are billed per attended training by admins from
  // Admin -> Invoices, so the onboarding invoice skips the training line.
  // We use 'monthly' as a safe placeholder for downstream early-bird and
  // fee-type calculations that don't apply to per_session anyway.
  const isDropIn = swimmer.preferred_payment_type === 'per_session'
  const resolvedPaymentType = isDropIn
    ? 'monthly'
    : (paymentType ?? swimmer.preferred_payment_type ?? 'monthly')

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

  const siblingIndex = siblings.findIndex((s) => s.id === swimmerId)
  const isFreeSwimmer = siblingIndex >= 3
  const applyEarlyBird = resolvedPaymentType === 'monthly' && isEarlyBirdEligible()

  const squad =
    swimmer.squads && !Array.isArray(swimmer.squads)
      ? swimmer.squads
      : swimmer.squads?.[0]

  // Under-6 check: registration fee is waived at invoice creation time
  const ageAtInvoice = calculateAge(swimmer.date_of_birth)
  const isUnderSix = ageAtInvoice < 6
  const registrationFeeAmount = isUnderSix ? 0 : REGISTRATION_FEE

  // Drop-in swimmers: training fee is billed per-session by admin; exclude from onboarding invoice
  const trainingFee = (isFreeSwimmer || isDropIn)
    ? 0
    : trainingFeeFromSquadRow(squad, resolvedPaymentType, applyEarlyBird)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentYear = new Date().getFullYear()
  const currentQuarter = `${currentYear}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      parent_id: swimmer.parent_id,
      swimmer_id: swimmerId,
      status: 'issued',
      total_amount: 0,
      payment_method: 'paystack',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (invErr || !invoice) {
    return { error: invErr?.message || 'Failed to create invoice' }
  }

  const squadLabel = squad?.name || 'Squad'
  const registrationDescription = `Annual Registration: ${swimmer.first_name} ${swimmer.last_name}${isUnderSix ? ' (Under 6, waived)' : ''}`
  const items = [
    {
      invoice_id: invoice.id,
      description: registrationDescription,
      amount: registrationFeeAmount,
      quantity: 1,
      fee_type: 'registration',
      payment_period: null,
    },
  ]

  // Only add a training fee line item for non-drop-in swimmers
  if (!isDropIn) {
    let trainingDescription = `${resolvedPaymentType === 'quarterly' ? 'Quarterly' : 'Monthly'} Training Fee: ${swimmer.first_name} ${swimmer.last_name} (${squadLabel})`
    if (isFreeSwimmer) {
      trainingDescription += ' (4th sibling, free)'
    } else if (applyEarlyBird && squad?.early_bird_eligible) {
      trainingDescription += ' (Early Bird)'
    }

    items.push({
      invoice_id: invoice.id,
      description: trainingDescription,
      amount: trainingFee,
      quantity: 1,
      fee_type: resolvedPaymentType === 'quarterly' ? 'quarterly_training' : 'monthly_training',
      payment_period: resolvedPaymentType === 'quarterly' ? currentQuarter : currentMonth,
    })
  }

  const { error: liErr } = await supabase.from('invoice_line_items').insert(items)
  if (liErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: liErr.message }
  }

  return { success: true, invoiceId: invoice.id }
}
