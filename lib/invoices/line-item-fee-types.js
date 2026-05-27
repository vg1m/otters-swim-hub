/**
 * invoice_line_items.fee_type values (CHECK: migrations 041, 055, 083).
 */

export const LINE_ITEM_FEE_TYPES = [
  { value: 'monthly_training', label: 'Monthly training' },
  { value: 'quarterly_training', label: 'Quarterly training' },
  { value: 'registration', label: 'Registration' },
  { value: 'drop_in', label: 'Drop-in' },
  { value: 'other', label: 'Other / miscellaneous' },
  { value: 'early_bird_discount', label: 'Early bird discount' },
]

/** Fee types admins may pick when manually creating invoices (excludes system-only types). */
export const ADMIN_CREATABLE_FEE_TYPES = LINE_ITEM_FEE_TYPES.filter(
  (t) => t.value !== 'early_bird_discount'
)

const labelByValue = Object.fromEntries(
  LINE_ITEM_FEE_TYPES.map((t) => [t.value, t.label])
)

export function feeTypeLabel(feeType) {
  if (!feeType) return '—'
  return labelByValue[feeType] ?? feeType
}
