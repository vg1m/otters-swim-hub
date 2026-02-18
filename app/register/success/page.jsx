'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatKES } from '@/lib/utils/currency'

function SuccessPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('invoiceId')
  const payLater = searchParams.get('payLater') === 'true'
  
  // For unauthenticated users (pay later), don't query database (RLS will block)
  // Just display success message with invoice ID

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card padding="large">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <svg 
                  className="w-16 h-16 text-green-600 dark:text-green-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Registration Submitted Successfully!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {payLater 
                  ? 'Your registration has been received. An invoice has been sent to your email.'
                  : 'Thank you for completing your registration with Otters Kenya Swim Club.'
                }
              </p>
            </div>

            {/* Registration Details (No database query - uses URL params only) */}
            {invoiceId && (
              <div className="bg-stone-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Registration Details
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Reference ID:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {invoiceId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Registration Fee:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {formatKES(3500)}
                    </span>
                  </div>
                  {payLater && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Pending Payment
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                What happens next?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                {payLater ? (
                  <>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Create your account using the email address you provided during registration
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Login to your dashboard and click "Pay Now" to complete payment via Card, Mobile Money, or Bank Transfer
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Your swimmer registration will be approved once payment is confirmed
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      You'll receive a confirmation email once your registration is processed
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Training schedule and club updates will be shared via email
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Create an account to access your parent dashboard
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {payLater ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => router.push('/signup')}
                    fullWidth
                  >
                    Create Account
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/login')}
                    fullWidth
                  >
                    Already Have Account? Login
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => router.push('/login')}
                  fullWidth
                >
                  Login to Dashboard
                </Button>
              )}
            </div>

            {/* Email Notification Note */}
            {payLater && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                  <strong>Note:</strong> Email notifications will be enabled soon. For now, create your account and access your invoice from the dashboard.
                </p>
              </div>
            )}

            {/* Support Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Questions about your registration?{' '}
                <a 
                  href="mailto:victor@mwago.me" 
                  className="text-primary hover:text-primary-dark font-medium"
                >
                  Contact us
                </a>
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}
