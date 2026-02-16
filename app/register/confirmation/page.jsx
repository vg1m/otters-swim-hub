'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('invoiceId')
  const [status, setStatus] = useState('processing') // processing, success, failed

  useEffect(() => {
    // Poll for payment status
    if (!invoiceId) return

    const pollInterval = setInterval(async () => {
      try {
        // In a real implementation, you'd check the payment status
        // For now, we'll simulate a successful payment after 5 seconds
        setTimeout(() => {
          setStatus('success')
          clearInterval(pollInterval)
        }, 5000)
      } catch (error) {
        console.error('Status check error:', error)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [invoiceId])

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-accent to-white py-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card padding="lg">
            <div className="text-center">
              {status === 'processing' && (
                <>
                  <div className="mb-6">
                    <svg className="animate-spin h-16 w-16 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Processing Payment...
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Please complete the M-Pesa payment on your phone. 
                    Do not close this page.
                  </p>
                  <div className="bg-accent rounded-lg p-4 text-sm text-gray-700">
                    <p>1. Check your phone for the M-Pesa prompt</p>
                    <p>2. Enter your M-Pesa PIN</p>
                    <p>3. Confirm the payment</p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="mb-6">
                    <svg className="h-16 w-16 mx-auto text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Registration Successful!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your payment has been received and your swimmers have been registered.
                    You will receive a confirmation email shortly.
                  </p>
                  <div className="bg-accent rounded-lg p-4 mb-6 text-left">
                    <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>✓ Admin will review and approve your registration</li>
                      <li>✓ You will receive login credentials via email</li>
                      <li>✓ Access your dashboard to view swimmers and training sessions</li>
                      <li>✓ Check attendance and payment history</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/">
                      <Button variant="secondary">
                        Back to Home
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button>
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {status === 'failed' && (
                <>
                  <div className="mb-6">
                    <svg className="h-16 w-16 mx-auto text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Payment Failed
                  </h2>
                  <p className="text-gray-600 mb-6">
                    We could not process your payment. Please try again.
                  </p>
                  <Link href="/register">
                    <Button>
                      Try Again
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}
