'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validatePassword, getPasswordStrength } from '@/lib/utils/password-validation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  const [bridgeError, setBridgeError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const passwordStrength = password ? getPasswordStrength(password) : null

  useEffect(() => {
    let cancelled = false

    // PASSWORD_RECOVERY fires when exchangeCodeForSession succeeds below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidToken(true)
        setCheckingToken(false)
      }
    })

    async function init() {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlError = params.get('error') || params.get('error_description')
        const code = params.get('code')

        if (urlError) {
          setBridgeError(decodeURIComponent(urlError.replace(/\+/g, ' ')))
          setCheckingToken(false)
          return
        }

        if (code) {
          // Remove the code from the URL so a refresh doesn't re-attempt the exchange.
          window.history.replaceState({}, '', '/reset-password')
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (error) {
            setBridgeError(
              'This reset link has expired or already been used. Please request a new one.'
            )
            setCheckingToken(false)
          }
          // On success PASSWORD_RECOVERY fires above and sets isValidToken.
          return
        }

        // No code in URL — check for a pre-existing recovery session (page refresh).
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setIsValidToken(!!session)
        setCheckingToken(false)
      } catch (e) {
        if (!cancelled) {
          setBridgeError(e.message || 'Something went wrong verifying the reset link.')
          setCheckingToken(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const validation = validatePassword(password)
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error))
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      await supabase.auth.signOut()

      toast.success('Password reset successfully! Please login with your new password.')

      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error) {
      toast.error(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (bridgeError) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-soft border border-transparent dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-gray-100 mb-4">Reset link problem</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{bridgeError}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              If you requested the reset in one browser, open the email link in that same browser. Email preview or
              security scanners can also break one-time links—request a new reset and tap the button once.
            </p>
            <Link href="/forgot-password">
              <button
                type="button"
                className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
              >
                Request new link
              </button>
            </Link>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary">
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-soft border border-transparent dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-gray-100 mb-4">Invalid or Expired Link</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              If you already reset your password, sign in with the new password. Otherwise use the same browser you used
              to request the reset when you open the email link.
            </p>
            <Link href="/forgot-password">
              <button
                type="button"
                className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
              >
                Request New Link
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-soft border border-transparent dark:border-gray-700">
        <div>
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-center text-3xl font-bold text-stone-900 dark:text-gray-100 tracking-tightest mb-2">
            Create New Password
          </h2>
          <p className="text-center text-stone-600 dark:text-gray-400">Enter your new password below</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.color === 'red'
                            ? 'bg-red-500'
                            : passwordStrength.color === 'yellow'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.color === 'red'
                          ? 'text-red-600'
                          : passwordStrength.color === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Min 10 characters with uppercase, lowercase, number & special character
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-50 dark:focus:ring-offset-gray-800 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link href="/login" className="font-medium text-gray-600 dark:text-gray-400 hover:text-primary">
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
