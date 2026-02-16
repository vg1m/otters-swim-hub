// Format amount to Kenyan Shillings
export function formatKES(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Calculate registration fees
export function calculateRegistrationFee(numberOfSwimmers) {
  const feePerSwimmer = 3500 // KES 3,500 per swimmer
  return numberOfSwimmers * feePerSwimmer
}
