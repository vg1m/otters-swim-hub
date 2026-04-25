'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ConsentPolicy from '@/components/ConsentPolicy'
import {
  formatKES,
  REGISTRATION_FEE,
  EARLY_BIRD_DISCOUNT,
  OCCASIONAL_SWIMMER_RATE,
  SESSION_TIER_PRICING,
  buildRegistrationFeeLines,
  sumRegistrationFeesFromLines,
} from '@/lib/utils/currency'
import { calculateAge } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

const REGISTER_PARENT_STORAGE_KEY = 'otters_register_parent_prefill'

function emptyParentInfo() {
  return {
    fullName: '',
    email: '',
    phone: '',
    relationship: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    shareHubAccess: false,
    coParentName: '',
    coParentEmail: '',
  }
}

function mapProfileToParentInfo(profile) {
  return {
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone_number || '',
    relationship: profile?.relationship || '',
    emergencyContactName: profile?.emergency_contact_name || '',
    emergencyContactRelationship: profile?.emergency_contact_relationship || '',
    emergencyContactPhone: profile?.emergency_contact_phone || '',
    shareHubAccess: false,
    coParentName: '',
    coParentEmail: '',
  }
}

function mergeParentFromProfileAndStorage(profile, stored) {
  const m = profile ? mapProfileToParentInfo(profile) : emptyParentInfo()
  const s = stored && typeof stored === 'object' ? stored : {}
  return {
    fullName: m.fullName || s.fullName || '',
    email: m.email || s.email || '',
    phone: m.phone || s.phone || '',
    relationship: m.relationship || s.relationship || '',
    emergencyContactName: m.emergencyContactName || s.emergencyContactName || '',
    emergencyContactRelationship: m.emergencyContactRelationship || s.emergencyContactRelationship || '',
    emergencyContactPhone: m.emergencyContactPhone || s.emergencyContactPhone || '',
    shareHubAccess: Boolean(s.shareHubAccess),
    coParentName: s.coParentName || m.coParentName || '',
    coParentEmail: s.coParentEmail || m.coParentEmail || '',
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const prefillAppliedRef = useRef(false)
  const [prefillSource, setPrefillSource] = useState(null)
  const [contactsExpanded, setContactsExpanded] = useState(true)
  const prevSwimmerCountRef = useRef(1)

  const [parentInfo, setParentInfo] = useState(() => emptyParentInfo())

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

  const feeLines = useMemo(() => buildRegistrationFeeLines(swimmers), [swimmers])
  const registrationOneTimeTotal = useMemo(
    () => sumRegistrationFeesFromLines(feeLines),
    [feeLines]
  )

  const updateParentInfo = (field, value) => {
    setParentInfo((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (authLoading) return
    if (user) return

    let stored = null
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(REGISTER_PARENT_STORAGE_KEY)
        if (raw) stored = JSON.parse(raw)
      }
    } catch (_) {}

    if (!stored || typeof stored !== 'object') return
    const merged = mergeParentFromProfileAndStorage(null, stored)
    const hasAny =
      merged.fullName ||
      merged.email ||
      merged.phone ||
      merged.emergencyContactName
    if (!hasAny) return
    setParentInfo(merged)
    setPrefillSource('saved')
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading) return
    if (!user || !profile) return

    let stored = null
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(REGISTER_PARENT_STORAGE_KEY)
        if (raw) stored = JSON.parse(raw)
      }
    } catch (_) {}

    const merged = mergeParentFromProfileAndStorage(profile, stored)
    const hasAny =
      merged.fullName ||
      merged.email ||
      merged.phone ||
      merged.emergencyContactName
    if (!hasAny) return
    setParentInfo(merged)
    setPrefillSource(profile.full_name || profile.email ? 'account' : 'saved')
  }, [authLoading, user, profile])

  useEffect(() => {
    if (swimmers.length === 1) {
      setContactsExpanded(true)
      prevSwimmerCountRef.current = 1
      return
    }
    if (swimmers.length > 1 && prevSwimmerCountRef.current === 1) {
      setContactsExpanded(false)
    }
    prevSwimmerCountRef.current = swimmers.length
  }, [swimmers.length])

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
      const age = calculateAge(swimmer.dateOfBirth)
      // Under-6 swimmers are auto-assigned Pups (1–2); training tier is not user-selected.
      if (age >= 6 && !swimmer.sessionsPerWeek) {
        toast.error(`Please select a training frequency for ${name}`)
        return false
      }
      // Competitive gala opt-in does not apply to Pups (under 6).
      if (age >= 6 && swimmer.galaEventsOptIn === null) {
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
    if (parentInfo.shareHubAccess) {
      if (!parentInfo.coParentEmail?.trim()) {
        toast.error('Please enter the email for the person you want to share access with')
        return false
      }
      if (!emailRegex.test(parentInfo.coParentEmail.trim())) {
        toast.error('Please enter a valid co-parent email address')
        return false
      }
      const a = parentInfo.email.trim().toLowerCase()
      const b = parentInfo.coParentEmail.trim().toLowerCase()
      if (a === b) {
        toast.error('Co-parent email must be different from your own email')
        return false
      }
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
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(REGISTER_PARENT_STORAGE_KEY, JSON.stringify(parentInfo))
        }
      } catch (_) {}

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
            {prefillSource && (
              <div
                className="rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm text-stone-800 dark:text-stone-200"
                role="status"
              >
                We&apos;ve filled in your contact details
                {prefillSource === 'account'
                  ? ' from your account'
                  : ' from your last visit on this device'}
                . Please review before submitting.
              </div>
            )}

            {swimmers.length > 1 && !contactsExpanded ? (
              <Card
                title="Your contact details"
                padding="normal"
                subtitle="Saved for this application. Expand to edit"
              >
                <div className="space-y-4">
                  <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        Parent/guardian:
                      </span>{' '}
                      {parentInfo.fullName || 'N/A'} · {parentInfo.email || 'N/A'} · {parentInfo.phone || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Emergency:</span>{' '}
                      {parentInfo.emergencyContactName || 'N/A'} · {parentInfo.emergencyContactPhone || 'N/A'}
                    </p>
                    {parentInfo.shareHubAccess && parentInfo.coParentEmail && (
                      <p>
                        <span className="font-medium text-stone-900 dark:text-stone-100">
                          Shared access invite:
                        </span>{' '}
                        {parentInfo.coParentName ? `${parentInfo.coParentName} · ` : ''}
                        {parentInfo.coParentEmail}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setContactsExpanded(true)}>
                    Edit parent and emergency contact
                  </Button>
                </div>
              </Card>
            ) : (
              <>
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
                      helperText="Use the same email if you already have an account. We will link your swimmers."
                    />
                  </div>
                </Card>

                <Card
                  title="Emergency Contact"
                  padding="normal"
                  subtitle="Alternative contact in case of emergency"
                >
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

                <Card
                  title="Share hub access (optional)"
                  padding="normal"
                  subtitle="Invite a partner or co-parent to use the same dashboard with their own login"
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parentInfo.shareHubAccess}
                      onChange={(e) => updateParentInfo('shareHubAccess', e.target.checked)}
                      className="w-4 h-4 mt-1 text-primary focus:ring-primary rounded border-gray-300"
                    />
                    <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                      Share access with another adult (they sign up with their own email and see the same swimmers and
                      invoices).
                    </span>
                  </label>
                  {parentInfo.shareHubAccess && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-stone-200 dark:border-stone-600">
                      <Input
                        label="Their name (optional)"
                        value={parentInfo.coParentName}
                        onChange={(e) => updateParentInfo('coParentName', e.target.value)}
                        placeholder="Jane Doe"
                      />
                      <Input
                        label="Their email"
                        type="email"
                        required={parentInfo.shareHubAccess}
                        value={parentInfo.coParentEmail}
                        onChange={(e) => updateParentInfo('coParentEmail', e.target.value)}
                        placeholder="jane@example.com"
                        helperText="We’ll record an invite if you already have an account with us (same email as above)."
                      />
                    </div>
                  )}
                </Card>
              </>
            )}

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
                      setSwimmers((prev) => {
                        const next = [...prev]
                        const prevRow = prev[index]
                        const prevAge =
                          prevRow.dateOfBirth ? calculateAge(prevRow.dateOfBirth) : null
                        const row = { ...prevRow, dateOfBirth: dob }
                        if (dob) {
                          const newAge = calculateAge(dob)
                          if (newAge < 6) {
                            row.sessionsPerWeek = '1-2'
                            row.preferredPaymentType = 'monthly'
                            row.galaEventsOptIn = false
                          } else if (prevAge !== null && prevAge < 6) {
                            // Was Pups; now 6+ — require a fresh gala answer.
                            row.galaEventsOptIn = null
                          }
                        }
                        next[index] = row
                        return next
                      })
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
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{formatKES(7000)}/month</span>
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
                          const hasQuarterly = tier.quarterly !== null
                          const paymentType = swimmer.preferredPaymentType || 'monthly'
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

                              {/* Payment cadence for this tier (monthly / quarterly / per session) */}
                              {isSelected && (
                                <div className="ml-7 mt-3">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    How would you like to pay?
                                  </p>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`paymentType-${index}`}
                                        value="monthly"
                                        checked={paymentType === 'monthly'}
                                        onChange={() => updateSwimmer(index, 'preferredPaymentType', 'monthly')}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Monthly: {formatKES(tier.monthly)}
                                      </span>
                                    </label>
                                    {hasQuarterly && (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`paymentType-${index}`}
                                          value="quarterly"
                                          checked={paymentType === 'quarterly'}
                                          onChange={() => updateSwimmer(index, 'preferredPaymentType', 'quarterly')}
                                          className="w-4 h-4 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                          Quarterly: {formatKES(tier.quarterly)} (save {formatKES(tier.monthly * 3 - tier.quarterly)})
                                        </span>
                                      </label>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`paymentType-${index}`}
                                        value="per_session"
                                        checked={paymentType === 'per_session'}
                                        onChange={() => updateSwimmer(index, 'preferredPaymentType', 'per_session')}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Pay per session: {formatKES(OCCASIONAL_SWIMMER_RATE)} each
                                      </span>
                                    </label>
                                  </div>

                                  {paymentType === 'per_session' && (
                                    <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                      Per-session billing: you will be invoiced per attended training at {formatKES(OCCASIONAL_SWIMMER_RATE)}. No monthly commitment.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Early bird note — only for monthly swimmers (skipped for quarterly and per-session) */}
                      {swimmer.sessionsPerWeek && (swimmer.preferredPaymentType || 'monthly') === 'monthly' && (
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

                {/* Competitive events / gala opt-in — not shown for Pups (under 6) */}
                {swimmer.dateOfBirth && calculateAge(swimmer.dateOfBirth) >= 6 && (
                  <div className="mt-5">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Do you wish for this swimmer to participate in competitive swimming events?{' '}
                      <span className="text-red-500">*</span>
                    </p>
                    <div className="flex gap-6">
                      {[
                        { value: true, label: 'Yes' },
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
                )}
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
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                This registration (based on your choices above)
              </p>
              <div className="space-y-4 text-sm">
                {feeLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 bg-slate-50/80 dark:bg-gray-900/40"
                  >
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{line.displayName}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600 dark:text-gray-400">Annual registration (one-time)</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-right">
                          {line.registrationAmount === null
                            ? 'N/A'
                            : line.isUnderSix
                              ? `${formatKES(0)} (under 6 waived)`
                              : formatKES(line.registrationAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 items-start">
                        <span className="text-gray-600 dark:text-gray-400">Training</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[min(100%,14rem)]">
                          {line.isWaivedTraining
                            ? line.trainingLabel
                            : line.trainingIncomplete && line.trainingAmount == null
                              ? line.trainingLabel
                              : line.isDropIn
                                ? `${formatKES(line.trainingAmount)} per session`
                                : line.trainingPeriod === 'quarter'
                                  ? `${formatKES(line.trainingAmount)} per quarter`
                                  : line.trainingPeriod === 'month'
                                    ? `${formatKES(line.trainingAmount)}/month`
                                    : line.trainingLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between py-3 border-t border-gray-200 dark:border-gray-600 font-semibold text-gray-900 dark:text-gray-100">
                  <span>Total annual registration (this application)</span>
                  <span>{formatKES(registrationOneTimeTotal)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recurring training fees are shown per swimmer; monthly and quarterly amounts are not combined into one
                  total when they differ.
                </p>
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
