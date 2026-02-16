'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
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
  })

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

  const validateForm = () => {
    // Validate parent info
    if (!parentInfo.fullName || !parentInfo.email || !parentInfo.phone) {
      toast.error('Please fill in all parent information')
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

    // Validate swimmers
    for (let i = 0; i < swimmers.length; i++) {
      const swimmer = swimmers[i]
      if (!swimmer.firstName || !swimmer.lastName || !swimmer.dateOfBirth || !swimmer.gender || !swimmer.squad) {
        toast.error(`Please complete all fields for Swimmer ${i + 1}`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    const totalAmount = calculateRegistrationFee(swimmers.length)

    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          swimmers,
          parentInfo,
          totalAmount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed')
      }

      toast.success(data.message || 'Payment request sent! Check your phone to complete payment.')
      
      // Redirect to confirmation page after a delay
      setTimeout(() => {
        router.push(`/register/confirmation?invoiceId=${data.invoiceId}`)
      }, 3000)
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  const totalAmount = calculateRegistrationFee(swimmers.length)

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
            <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 mb-4 tracking-tightest">
              Join <span className="text-primary">Otters Kenya</span>
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed">
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
                  helperText="M-Pesa payment prompt will be sent to this number"
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

            {/* Payment Summary */}
            <Card title="Payment Summary" padding="normal">
              <div className="space-y-3">
                {swimmers.map((swimmer, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {swimmer.firstName || `Swimmer ${index + 1}`} {swimmer.lastName} - Registration Fee
                    </span>
                    <span className="font-medium text-gray-900">{formatKES(3500)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
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
                {loading ? 'Processing...' : `Complete Registration (${formatKES(totalAmount)})`}
              </Button>
              <p className="text-sm text-stone-600 text-center max-w-md">
                Secure online payment. You'll receive a confirmation email once your registration is approved.
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  )
}
