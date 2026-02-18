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
import { calculateRegistrationFee, formatKES } from '@/lib/utils/currency'
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

  // Swimmers array
  const [swimmers, setSwimmers] = useState([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      squad: '',
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
    const totalAmount = calculateRegistrationFee(swimmers.length)

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

  const totalAmount = calculateRegistrationFee(swimmers.length)

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
              <div className="space-y-3">
                {swimmers.map((swimmer, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {swimmer.firstName || `Swimmer ${index + 1}`} {swimmer.lastName} - Registration Fee
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatKES(3500)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
                  <span className="text-primary">{formatKES(totalAmount)}</span>
                </div>
              </div>
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
                {loading ? 'Processing...' : paymentOption === 'pay_now' 
                  ? `Pay Now (${formatKES(totalAmount)})` 
                  : `Submit Registration`
                }
              </Button>
              <p className="text-sm text-stone-600 dark:text-gray-400 text-center max-w-md">
                {paymentOption === 'pay_now' 
                  ? 'Payments secured by PayStack™. You\'ll be notified once your registration is approved.'
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
