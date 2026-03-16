'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ConsentPolicy from '@/components/ConsentPolicy'
import {
  calculateRegistrationFee,
  calculateTotalRegistrationCost,
  formatKES,
  isEarlyBirdEligible,
  getQuarterlySaving,
  hasQuarterlyOption,
  EARLY_BIRD_DISCOUNT,
  OCCASIONAL_SWIMMER_RATE,
  REGISTRATION_FEE,
  SQUAD_PRICING,
} from '@/lib/utils/currency'
import { calculateAge } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Parent information
  const [parentInfo, setParentInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    relationship: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  })

  // Consent state
  const [consents, setConsents] = useState({
    dataAccuracy: false,
    codeOfConduct: false,
    mediaConsent: true, // Default to true, can opt-out
  })

  // Payment option
  const [paymentOption, setPaymentOption] = useState('pay_now') // 'pay_now' or 'pay_later'
  const [paymentType, setPaymentType] = useState('monthly') // 'monthly' or 'quarterly'

  // Swimmers array
  const [swimmers, setSwimmers] = useState([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      squad: '',
      galaEventsOptIn: false,
    },
  ])

  const addSwimmer = () => {
    setSwimmers([
      ...swimmers,
      {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        squad: '',
        galaEventsOptIn: false,
      },
    ])
  }

  const removeSwimmer = (index) => {
    if (swimmers.length === 1) {
      toast.error('At least one swimmer is required')
      return
    }
    const newSwimmers = swimmers.filter((_, i) => i !== index)
    setSwimmers(newSwimmers)
  }

  const updateSwimmer = (index, field, value) => {
    const newSwimmers = [...swimmers]
    newSwimmers[index][field] = value
    setSwimmers(newSwimmers)
  }

  const updateParentInfo = (field, value) => {
    setParentInfo({ ...parentInfo, [field]: value })
  }

  const onConsentChange = (field, value) => {
    setConsents({ ...consents, [field]: value })
  }

  const validateForm = () => {
    // Validate parent info
    if (!parentInfo.fullName || !parentInfo.email || !parentInfo.phone || !parentInfo.relationship) {
      toast.error('Please fill in all parent/guardian information including relationship')
      return false
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(parentInfo.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    // Validate phone (Kenyan format)
    const phoneRegex = /^(\+254|254|0)[17]\d{8}$/
    if (!phoneRegex.test(parentInfo.phone)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)')
      return false
    }

    // Validate emergency contact
    if (!parentInfo.emergencyContactName || !parentInfo.emergencyContactRelationship || !parentInfo.emergencyContactPhone) {
      toast.error('Please fill in all emergency contact information')
      return false
    }

    if (!phoneRegex.test(parentInfo.emergencyContactPhone)) {
      toast.error('Please enter a valid emergency contact phone number')
      return false
    }

    // Validate swimmers
    for (let i = 0; i < swimmers.length; i++) {
      const swimmer = swimmers[i]
      if (!swimmer.firstName || !swimmer.lastName || !swimmer.dateOfBirth || !swimmer.gender || !swimmer.squad) {
        toast.error(`Please complete all fields for Swimmer ${i + 1}`)
        return false
      }
    }

    // Validate swimmer ages (minimum 5 years)
    for (let i = 0; i < swimmers.length; i++) {
      const swimmer = swimmers[i]
      const age = calculateAge(swimmer.dateOfBirth)
      
      if (age < 5) {
        toast.error(
          `${swimmer.firstName || 'Swimmer ' + (i + 1)} must be at least 5 years old to register. ` +
          `Current age: ${age} years. Please contact us if you have questions.`
        )
        return false
      }
    }

    // Validate required consents
    if (!consents.dataAccuracy) {
      toast.error('Please confirm that the information provided is accurate')
      return false
    }

    if (!consents.codeOfConduct) {
      toast.error('Please agree to the club code of conduct and safety rules')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent duplicate submissions
    if (loading) {
      console.log('Submission already in progress, ignoring duplicate')
      return
    }

    if (!validateForm()) {
      return
    }

    setLoading(true)
    const earlyBird = paymentType === 'monthly' && isEarlyBirdEligible()
    const costBreakdown = calculateTotalRegistrationCost(swimmers, paymentType, earlyBird)
    const totalAmount = costBreakdown.total

    try {
      console.log('Submitting registration with Paystack...')
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          swimmers,
          parentInfo,
          totalAmount,
          costBreakdown,
          paymentType,
          earlyBird,
          consents,
          paymentOption,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Registration failed:', data)
        throw new Error(data.error || 'Registration failed')
      }

      if (paymentOption === 'pay_later') {
        // Pay later flow - show success message with invoice details
        console.log('Pay later successful, redirecting to success page')
        toast.success('Registration submitted successfully! Invoice sent to your email.')
        router.push(`/register/success?invoiceId=${data.invoiceId}&payLater=true`)
      } else {
        // Pay now flow - redirect to Paystack checkout page
        console.log('Redirecting to Paystack checkout:', data.authorization_url)
        toast.success('Redirecting to secure payment page...')
        
        // Redirect to Paystack hosted checkout
        setTimeout(() => {
          window.location.href = data.authorization_url
        }, 1000)
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  // Determine early bird eligibility for the summary display
  const earlyBirdActive = paymentType === 'monthly' && isEarlyBirdEligible()

  // Quarterly is only available if at least one swimmer has a squad with a quarterly option
  const anyQuarterlyEligible = swimmers.some(s => hasQuarterlyOption(s.squad))

  // If paymentType is quarterly but no swimmer qualifies, reset to monthly
  // (handled gracefully in calculateTotalRegistrationCost via fallback)

  const relationshipOptions = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'guardian', label: 'Legal Guardian' },
    { value: 'other', label: 'Other' },
  ]

  const squadOptions = [
    { value: 'competitive', label: 'Competitive' },
    { value: 'learn_to_swim', label: 'Learn to Swim' },
    { value: 'fitness', label: 'Fitness' },
  ]

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ]

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-stone-50 dark:bg-gray-900 py-12 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-gray-100 mb-4 tracking-tightest">
              Join <span className="text-primary">Otters Kenya</span>
            </h1>
            <p className="text-lg text-stone-600 dark:text-gray-400 leading-relaxed">
              Register your swimmers and become part of our swimming family
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Parent Information */}
            <Card title="Parent / Guardian Information" padding="normal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  value={parentInfo.fullName}
                  onChange={(e) => updateParentInfo('fullName', e.target.value)}
                  placeholder="John Doe"
                />
                <Select
                  label="Relationship to Swimmer"
                  required
                  value={parentInfo.relationship}
                  onChange={(e) => updateParentInfo('relationship', e.target.value)}
                  options={relationshipOptions}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={parentInfo.email}
                  onChange={(e) => updateParentInfo('email', e.target.value)}
                  placeholder="john@example.com"
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  required
                  value={parentInfo.phone}
                  onChange={(e) => updateParentInfo('phone', e.target.value)}
                  placeholder="0712345678"
                  helperText="Payment prompts will be sent to this number"
                />
              </div>
            </Card>

            {/* Emergency Contact Information */}
            <Card title="Emergency Contact" padding="normal" subtitle="Alternative contact in case of emergency">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  value={parentInfo.emergencyContactName}
                  onChange={(e) => updateParentInfo('emergencyContactName', e.target.value)}
                  placeholder="Jane Doe"
                />
                <Select
                  label="Relationship"
                  required
                  value={parentInfo.emergencyContactRelationship}
                  onChange={(e) => updateParentInfo('emergencyContactRelationship', e.target.value)}
                  options={relationshipOptions}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  required
                  value={parentInfo.emergencyContactPhone}
                  onChange={(e) => updateParentInfo('emergencyContactPhone', e.target.value)}
                  placeholder="0712345678"
                />
              </div>
            </Card>

            {/* Swimmers */}
            {swimmers.map((swimmer, index) => (
              <Card
                key={index}
                title={`Swimmer ${index + 1}`}
                padding="normal"
                footer={
                  swimmers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSwimmer(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove Swimmer
                    </button>
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    required
                    value={swimmer.firstName}
                    onChange={(e) => updateSwimmer(index, 'firstName', e.target.value)}
                    placeholder="First Name"
                  />
                  <Input
                    label="Last Name"
                    required
                    value={swimmer.lastName}
                    onChange={(e) => updateSwimmer(index, 'lastName', e.target.value)}
                    placeholder="Last Name"
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    required
                    value={swimmer.dateOfBirth}
                    onChange={(e) => updateSwimmer(index, 'dateOfBirth', e.target.value)}
                  />
                  <Select
                    label="Gender"
                    required
                    value={swimmer.gender}
                    onChange={(e) => updateSwimmer(index, 'gender', e.target.value)}
                    options={genderOptions}
                  />
                  <Select
                    label="Squad"
                    required
                    value={swimmer.squad}
                    onChange={(e) => updateSwimmer(index, 'squad', e.target.value)}
                    options={squadOptions}
                    helperText="Choose the appropriate training group"
                  />
                </div>

                {/* Gala Events Opt-In */}
                <div className="mt-4">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary dark:hover:border-primary-light transition-colors">
                    <input
                      type="checkbox"
                      checked={swimmer.galaEventsOptIn || false}
                      onChange={(e) => updateSwimmer(index, 'galaEventsOptIn', e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Opt in for Gala Events</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Check this box to participate in competitive gala events. Additional fees may apply for gala participation.
                      </p>
                    </div>
                  </label>
                </div>
              </Card>
            ))}

            {/* Add Swimmer Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addSwimmer}
                disabled={loading}
              >
                + Add Another Swimmer
              </Button>
            </div>

            {/* Consent Section */}
            <Card title="Terms and Conditions" padding="normal" subtitle="Please review and agree to continue">
              <ConsentPolicy 
                consents={consents}
                onConsentChange={onConsentChange}
                showCheckboxes={true}
              />
            </Card>

            {/* Payment Options */}
            <Card title="Payment Option" padding="normal">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose how you would like to complete payment for the registration fee
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary dark:hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="paymentOption"
                      value="pay_now"
                      checked={paymentOption === 'pay_now'}
                      onChange={(e) => setPaymentOption(e.target.value)}
                      className="mt-1 w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Pay Now via M-Pesa</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Complete payment immediately and get instant confirmation
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary dark:hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="paymentOption"
                      value="pay_later"
                      checked={paymentOption === 'pay_later'}
                      onChange={(e) => setPaymentOption(e.target.value)}
                      className="mt-1 w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Pay Later via Invoice</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Receive an invoice via email. Registration pending until payment is received.
                      </p>
                    </div>
                  </label>
                </div>

                {paymentOption === 'pay_later' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <span className="font-semibold">Note:</span> Your registration will be marked as pending until payment is received. You can pay the invoice from your dashboard or via the link sent to your email.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Summary */}
            <Card title="Payment Summary" padding="normal">
              <div className="space-y-4">

                {/* Payment Type Selector */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Training Fee Payment Period
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value="monthly"
                        checked={paymentType === 'monthly'}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Monthly Payment
                        {earlyBirdActive && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                            Early Bird — {formatKES(EARLY_BIRD_DISCOUNT)} off
                          </span>
                        )}
                      </span>
                    </label>

                    {anyQuarterlyEligible && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentType"
                          value="quarterly"
                          checked={paymentType === 'quarterly'}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Quarterly Payment
                          {swimmers.some(s => getQuarterlySaving(s.squad) > 0) && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary dark:text-primary-light px-2 py-0.5 rounded-full">
                              Save up to {formatKES(Math.max(...swimmers.map(s => getQuarterlySaving(s.squad))))}
                            </span>
                          )}
                        </span>
                      </label>
                    )}

                    {!anyQuarterlyEligible && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                        Quarterly payment is not available for the Learn to Swim squad.
                      </p>
                    )}
                  </div>
                </div>

                {/* Itemized Breakdown */}
                <div className="space-y-3">
                  {(() => {
                    const costBreakdown = calculateTotalRegistrationCost(swimmers, paymentType, earlyBirdActive)
                    return (
                      <>
                        {/* Registration Fees */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Annual Registration Fees
                          </p>
                          {swimmers.map((swimmer, index) => (
                            <div key={`reg-${index}`} className="flex justify-between text-sm pl-3">
                              <span className="text-gray-600 dark:text-gray-400">
                                {swimmer.firstName || `Swimmer ${index + 1}`} {swimmer.lastName}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{formatKES(REGISTRATION_FEE)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Training Fees */}
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {paymentType === 'quarterly' ? 'Quarterly' : 'Monthly'} Training Fees
                          </p>
                          {costBreakdown.breakdown.map((item, index) => (
                            <div key={`train-${index}`} className="flex justify-between text-sm pl-3 gap-2">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                                {item.swimmerName} — {item.squad.replace(/_/g, ' ').toUpperCase()}
                                {item.isFreeSwimmer && (
                                  <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    4th sibling — Free
                                  </span>
                                )}
                                {item.earlyBirdApplied && (
                                  <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    Early Bird
                                  </span>
                                )}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
                                {item.isFreeSwimmer ? (
                                  <span className="text-green-600 dark:text-green-400">FREE</span>
                                ) : (
                                  formatKES(item.trainingFee)
                                )}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Registration Fees Subtotal</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{formatKES(costBreakdown.registrationFees)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Training Fees Subtotal</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{formatKES(costBreakdown.trainingFees)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2">
                            <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
                            <span className="text-primary">{formatKES(costBreakdown.total)}</span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Occasional Swimmer info */}
                <div className="bg-stone-50 dark:bg-gray-700/40 border border-stone-200 dark:border-gray-600 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Occasional / Drop-In Swimmer?</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drop-in sessions are available at <span className="font-semibold">{formatKES(OCCASIONAL_SWIMMER_RATE)} per class</span>. Contact the club directly to arrange — no registration required.
                  </p>
                </div>

              </div>
            </Card>

            {/* Fee Terms & Conditions */}
            <Card padding="normal">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fee Terms &amp; Conditions</span>
                  <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Fees are payable either monthly or quarterly.</li>
                    <li>Once a member, fees are due per calendar month for the season.</li>
                    <li>Otters Academy of Swimming Ltd reserves the right to change fees within the season should circumstances dictate this.</li>
                    <li>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Early Bird Discount:</span> A {formatKES(EARLY_BIRD_DISCOUNT)} discount applies to monthly training fees (Competitive and Fitness squads) when payment is received on or before the 3rd of the month.
                    </li>
                    <li>
                      <span className="font-medium text-gray-700 dark:text-gray-300">4th Sibling Free:</span> The 4th child and any subsequent siblings train free — the monthly or quarterly training fee is waived. The annual registration fee ({formatKES(REGISTRATION_FEE)}) still applies for each swimmer.
                    </li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Fee Schedule</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                      <div className="bg-stone-50 dark:bg-gray-700/40 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Competitive (1–4 sessions/week)</p>
                        <p>Monthly: {formatKES(SQUAD_PRICING.competitive.monthly)}</p>
                        <p className="text-green-600 dark:text-green-400">Early Bird: {formatKES(SQUAD_PRICING.competitive.monthly - EARLY_BIRD_DISCOUNT)}</p>
                        <p>Quarterly: {formatKES(SQUAD_PRICING.competitive.quarterly)}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-gray-700/40 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Fitness / Daily (Mon–Sat)</p>
                        <p>Monthly: {formatKES(SQUAD_PRICING.fitness.monthly)}</p>
                        <p className="text-green-600 dark:text-green-400">Early Bird: {formatKES(SQUAD_PRICING.fitness.monthly - EARLY_BIRD_DISCOUNT)}</p>
                        <p>Quarterly: {formatKES(SQUAD_PRICING.fitness.quarterly)}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-gray-700/40 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Pups / Learn to Swim (1–2 sessions/week)</p>
                        <p>Monthly: {formatKES(SQUAD_PRICING.learn_to_swim.monthly)}</p>
                        <p className="text-gray-500 dark:text-gray-500">No quarterly option</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-gray-700/40 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Annual Registration (all squads)</p>
                        <p>{formatKES(REGISTRATION_FEE)} per swimmer</p>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mt-1">Occasional / Drop-In</p>
                        <p>{formatKES(OCCASIONAL_SWIMMER_RATE)} per class</p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </Card>

            {/* Submit Button */}
            <div className="flex flex-col items-center space-y-4">
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={loading}
                fullWidth
                className="max-w-md rounded-2xl shadow-soft hover:shadow-md hover:scale-105 transition-all"
              >
                {(() => {
                  if (loading) return 'Processing...'
                  const costBreakdown = calculateTotalRegistrationCost(swimmers, paymentType, earlyBirdActive)
                  return paymentOption === 'pay_now'
                    ? `Pay Now (${formatKES(costBreakdown.total)})`
                    : `Submit Registration`
                })()}
              </Button>
              <p className="text-sm text-stone-600 dark:text-gray-400 text-center max-w-md">
                {paymentOption === 'pay_now' 
                  ? 'Payments secured by Paystack™. You\'ll be notified once your registration is approved.'
                  : 'Invoice will be sent to your email. Payment required to complete registration.'
                }
              </p>
              
              {loading && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                    ⚠️ Processing your registration... Please do not refresh or go back!
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  )
}
