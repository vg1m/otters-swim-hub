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
  const feePerSwimmer = 3500 // KES 3,500 per swimmer (annual)
  return numberOfSwimmers * feePerSwimmer
}

// Squad pricing tiers (monthly training fees)
export const SQUAD_PRICING = {
  pups: 7000,
  development: 12000,
  all_week: 14000,
  quarterly_discount: 27000 // for 3 months
}

// Calculate monthly training fee based on squad
export function calculateMonthlyTrainingFee(squad, paymentType = 'monthly') {
  if (paymentType === 'quarterly') {
    return SQUAD_PRICING.quarterly_discount
  }
  
  // Map registration squads to pricing tiers
  const squadMap = {
    'learn_to_swim': 'pups',
    'competitive': 'development',
    'fitness': 'all_week'
  }
  
  const pricingKey = squadMap[squad] || 'development'
  return SQUAD_PRICING[pricingKey]
}

// Calculate total registration cost (registration + training fees)
export function calculateTotalRegistrationCost(swimmers, paymentType = 'monthly') {
  const registrationFees = swimmers.length * 3500
  const trainingFees = swimmers.reduce((sum, swimmer) => {
    return sum + calculateMonthlyTrainingFee(swimmer.squad, paymentType)
  }, 0)
  
  return {
    registrationFees,
    trainingFees,
    total: registrationFees + trainingFees,
    breakdown: swimmers.map(swimmer => ({
      swimmerName: `${swimmer.firstName} ${swimmer.lastName}`,
      registrationFee: 3500,
      trainingFee: calculateMonthlyTrainingFee(swimmer.squad, paymentType),
      squad: swimmer.squad
    }))
  }
}
