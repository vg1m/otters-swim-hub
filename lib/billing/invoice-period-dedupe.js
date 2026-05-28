/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} swimmerId
 * @param {string} feeType
 * @param {string} paymentPeriod
 */
export async function hasBillingLineForPeriod(supabase, swimmerId, feeType, paymentPeriod) {
  if (!paymentPeriod) return false

  const { data, error } = await supabase
    .from('invoice_line_items')
    .select('id, invoices!inner ( swimmer_id, status )')
    .eq('fee_type', feeType)
    .eq('payment_period', paymentPeriod)
    .eq('invoices.swimmer_id', swimmerId)
    .in('invoices.status', ['issued', 'due', 'paid'])

  if (error) {
    console.error('hasBillingLineForPeriod', error)
    return true
  }

  return (data?.length ?? 0) > 0
}
