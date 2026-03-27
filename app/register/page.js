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
import { formatKES, REGISTRATION_FEE, OCCASIONAL_SWIMMER_RATE, EARLY_BIRD_DISCOUNT, SESSION_TIER_PRICING } from '@/lib/utils/currency'
import { calculateAge } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [parentInfo, setParentInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    relationship: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  })

  const [consents, setConsents] = useState({
    dataAccuracy: false,
    codeOfConduct: false,
    mediaConsent: true,
  })

  const [swimmers, setSwimmers] = useState([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      galaEventsOptIn: null,
      sessionsPerWeek: '',
      preferredPaymentType: 'monthly',
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
        galaEventsOptIn: null,
        sessionsPerWeek: '',
        preferredPaymentType: 'monthly',
      },
    ])
  }

  const removeSwimmer = (index) => {
    if (swimmers.length === 1) {
      toast.error('At least one swimmer is required')
      return
    }
    setSwimmers(swimmers.filter((_, i) => i !== index))
  }

  const updateSwimmer = (index, field, value) => {
    const next = [...swimmers]
    next[index][field] = value
    setSwimmers(next)
  }

  const updateParentInfo = (field, value) => {
    setParentInfo({ ...parentInfo, [field]: value })
  }

  const onConsentChange = (field, value) => {
    setConsents({ ...consents, [field]: value })
  }

  const validateForm = () => {
    if (!parentInfo.fullName || !parentInfo.email || !parentInfo.phone || !parentInfo.relationship) {
      toast.error('Please fill in all parent/guardian information including relationship')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(parentInfo.email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    const phoneRegex = /^(\+254|254|0)[17]\d{8}$/
    if (!phoneRegex.test(parentInfo.phone)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)')
      return false
    }
    if (!parentInfo.emergencyContactName || !parentInfo.emergencyContactRelationship || !parentInfo.emergencyContactPhone) {
      toast.error('Please fill in all emergency contact information')
      return false
    }
    if (!phoneRegex.test(parentInfo.emergencyContactPhone)) {
      toast.error('Please enter a valid emergency contact phone number')
      return false
    }
    for (let i = 0; i < swimmers.length; i++) {
      const swimmer = swimmers[i]
      const name = swimmer.firstName || `Swimmer ${i + 1}`
      if (!swimmer.firstName || !swimmer.lastName || !swimmer.dateOfBirth || !swimmer.gender) {
        toast.error(`Please complete all fields for ${name}`)
        return false
      }
      if (!swimmer.sessionsPerWeek) {
        toast.error(`Please select a training frequency for ${name}`)
        return false
      }
      if (swimmer.galaEventsOptIn === null) {
        toast.error(`Please answer the competitive events question for ${name}`)
        return false
      }
    }
    for (let i = 0; i < swimmers.length; i++) {
      const swimmer = swimmers[i]
      const age = calculateAge(swimmer.dateOfBirth)
      if (age < 5) {
        toast.error(
          `${swimmer.firstName || 'Swimmer ' + (i + 1)} must be at least 5 years old to register. ` +
            `Current age: ${age} years.`
        )
        return false
      }
    }
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
    if (loading) return
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await fetch('/api/registration/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swimmers, parentInfo, consents }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      toast.success('Application submitted!')
      router.push('/register/success?application=true')
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const relationshipOptions = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'guardian', label: 'Legal Guardian' },
    { value: 'other', label: 'Other' },
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
              Submit your application. The club will assign a squad and coach; you pay from your dashboard once approved.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  helperText="Use the same email if you already have an account — we will link your swimmers."
                />
              </div>
            </Card>

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
                    onChange={(e) => {
                      const dob = e.target.value
                      updateSwimmer(index, 'dateOfBirth', dob)
                      // Auto-set 1-2 sessions for under-6 swimmers
                      if (dob && calculateAge(dob) < 6) {
                        updateSwimmer(index, 'sessionsPerWeek', '1-2')
                        updateSwimmer(index, 'preferredPaymentType', 'monthly')
                      }
                    }}
                  />
                  <Select
                    label="Gender"
                    required
                    value={swimmer.gender}
                    onChange={(e) => updateSwimmer(index, 'gender', e.target.value)}
                    options={genderOptions}
                  />
                </div>

                {/* Under-6 waiver notice */}
                {swimmer.dateOfBirth && calculateAge(swimmer.dateOfBirth) < 6 && (
                  <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Annual registration fee ({formatKES(REGISTRATION_FEE)}) waived for swimmers under 6
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                        This swimmer will be automatically placed in the Pups squad (1–2 days/week).
                      </p>
                    </div>
                  </div>
                )}

                {/* Training frequency */}
                <div className="mt-5">
                  {swimmer.dateOfBirth && calculateAge(swimmer.dateOfBirth) < 6 ? (
                    // Under-6: show locked Pups tier, no other options
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Training sessions per week
                      </p>
                      <div className="p-4 border-2 border-primary bg-primary/5 dark:bg-primary/10 rounded-lg flex items-center gap-3">
                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">1–2 days/week (Pups)</span>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">— {formatKES(7000)}/month</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically assigned for swimmers under 6</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Normal: full session tier selection
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Training sessions per week <span className="text-red-500">*</span>
                      </p>
                      <div className="space-y-2">
                        {Object.entries(SESSION_TIER_PRICING).map(([key, tier]) => {
                          const isSelected = swimmer.sessionsPerWeek === key
                          const hasQuarterly = !tier.dropIn && tier.quarterly !== null
                          return (
                            <div key={key}>
                              <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                              }`}>
                                <input
                                  type="radio"
                                  name={`sessionsPerWeek-${index}`}
                                  value={key}
                                  checked={isSelected}
                                  onChange={() => updateSwimmer(index, 'sessionsPerWeek', key)}
                                  className="w-4 h-4 mt-0.5 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{tier.label}</span>
                                </div>
                              </label>

                              {/* Quarterly toggle */}
                              {isSelected && hasQuarterly && (
                                <div className="ml-7 mt-2 flex gap-4">
                                  {['monthly', 'quarterly'].map((pt) => (
                                    <label key={pt} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`paymentType-${index}`}
                                        value={pt}
                                        checked={swimmer.preferredPaymentType === pt}
                                        onChange={() => updateSwimmer(index, 'preferredPaymentType', pt)}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                        {pt === 'quarterly'
                                          ? `Quarterly — ${formatKES(tier.quarterly)} (save ${formatKES(tier.monthly * 3 - tier.quarterly)})`
                                          : 'Monthly'}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* Drop-in info note */}
                              {isSelected && tier.dropIn && (
                                <p className="ml-7 mt-2 text-sm text-blue-700 dark:text-blue-300">
                                  Drop-in sessions are invoiced per attendance at {formatKES(tier.perSession)} each. No monthly commitment.
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Early bird note — only for non-drop-in */}
                      {swimmer.sessionsPerWeek && swimmer.sessionsPerWeek !== 'drop-in' && (
                        <p className="mt-3 text-xs text-green-700 dark:text-green-400 flex items-start gap-1">
                          <span>✓</span>
                          <span>
                            Early bird discount of {formatKES(EARLY_BIRD_DISCOUNT)} applies automatically if payment is initiated before the 3rd of the month.
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Competitive events / gala opt-in */}
                <div className="mt-5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Do you wish for this swimmer to participate in competitive swimming events? <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-6">
                    {[
                      { value: true,  label: 'Yes' },
                      { value: false, label: 'No' },
                    ].map(({ value, label }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`galaEvents-${index}`}
                          checked={swimmer.galaEventsOptIn === value}
                          onChange={() => updateSwimmer(index, 'galaEventsOptIn', value)}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Additional fees may apply for swimming events. You can update this preference later.
                  </p>
                </div>
              </Card>
            ))}

            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={addSwimmer} disabled={loading}>
                + Add Another Swimmer
              </Button>
            </div>

            <Card title="Terms and Conditions" padding="normal" subtitle="Please review and agree to continue">
              <ConsentPolicy consents={consents} onConsentChange={onConsentChange} showCheckboxes={true} />
            </Card>

            <Card title="Fee Summary" padding="normal">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                No payment is taken today. Once the club assigns a squad and approves your registration,
                an invoice will appear on your dashboard.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">Annual registration fee (per swimmer)</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatKES(REGISTRATION_FEE)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">1–2 days/week training</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatKES(7000)}/month</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">1–4 days/week training</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatKES(12000)}/month <span className="text-gray-400">or {formatKES(30000)}/quarter</span>
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">6 days/week training</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatKES(14000)}/month <span className="text-gray-400">or {formatKES(36000)}/quarter</span>
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">Occasional drop-in</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatKES(OCCASIONAL_SWIMMER_RATE)}/session</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-green-700 dark:text-green-400">
                  ✓ Early bird discount: {formatKES(EARLY_BIRD_DISCOUNT)} off monthly training if payment is initiated before the 3rd of the month (1–4 and 6-day tiers).
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ✓ 4th sibling onward: training fee waived; annual registration still applies per swimmer.
                </p>
              </div>
            </Card>

            <div className="flex flex-col items-center space-y-4">
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={loading}
                fullWidth
                className="max-w-md rounded-2xl shadow-soft hover:shadow-md hover:scale-105 transition-all"
              >
                {loading ? 'Submitting…' : 'Submit application'}
              </Button>
              <p className="text-sm text-stone-600 dark:text-gray-400 text-center max-w-md">
                You will not be charged today. Sign in later with the same email to pay once your registration is ready.
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  )
}
