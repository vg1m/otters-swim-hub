'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const SIGN_OUT_REASONS = {
  idle: 'You were signed out after 30 minutes of inactivity. Please sign in again.',
  expired: 'Your session expired for security reasons. Please sign in again.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [signOutReason, setSignOutReason] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // OAuth must hit /auth/callback so the server can exchange ?code= for a session.
    // If Supabase Site URL or redirect config sends users here with ?code=, forward them.
    if (params.get('code')) {
      window.location.replace(`/auth/callback?${params.toString()}`)
      return
    }
    const err = params.get('error')
    if (err) {
      toast.error(decodeURIComponent(err))
      window.history.replaceState({}, '', '/login')
      return
    }
    const reason = params.get('reason')
    if (reason && SIGN_OUT_REASONS[reason]) {
      setSignOutReason(reason)
      // Strip the query param so a refresh doesn't keep the banner forever.
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  /**
   * Where Supabase sends the user *after* OAuth completes: your app’s `/auth/callback`.
   * Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs
   * (e.g. http://localhost:3000/** and https://your-prod-domain.com/**).
   *
   * This is NOT the Google Cloud “Authorized redirect URI” (that stays
   * https://<project-ref>.supabase.co/auth/v1/callback for every environment).
   */
  const getOAuthRedirectUrl = () => {
    const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    if (envBase && envBase.startsWith('http')) {
      return `${envBase}/auth/callback`
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback`
    }
    return '/auth/callback'
  }

  const handleGoogleSignIn = async () => {
    setOauthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      })
      if (error) throw error
      if (data?.url) {
        window.location.assign(data.url)
        return
      }
      toast.error('Could not get Google sign-in URL')
      setOauthLoading(false)
    } catch (error) {
      toast.error(error.message || 'Could not start Google sign-in')
      setOauthLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const nextParam = params?.get('next')
      const next =
        typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
          ? nextParam
          : undefined

      // Sign in via a server route so auth cookies are returned as HTTP
      // Set-Cookie headers. This fixes a mobile bug where client-side
      // signInWithPassword writes to document.cookie and the subsequent
      // navigation could race the write, landing at the proxy with no
      // session and bouncing the user back to /login.
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(next ? { next } : {}) }),
        credentials: 'include',
      })

      let payload = null
      try {
        payload = await res.json()
      } catch {
        // non-JSON response; fall through to generic error below
      }

      if (!res.ok || !payload?.ok) {
        const message = payload?.error || 'Invalid email or password'
        throw new Error(message)
      }

      toast.success('Login successful!')

      const target = payload.next || '/dashboard'
      window.location.assign(target)
    } catch (error) {
      const msg = error?.message || ''
      if (error?.name === 'AbortError' || msg.includes('signal aborted')) {
        // Benign abort from a background request during navigation; ignore
        // so it doesn't surface as a scary toast.
        return
      }
      toast.error(msg || 'Login failed')
      setLoading(false)
    }
    // Note: Don't set loading to false on success - let redirect happen
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-soft border border-transparent dark:border-gray-700">
        <div>
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18 Q20 12 25 18" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M12 25 Q20 20 28 25" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <circle cx="15" cy="16" r="2" fill="white"/>
              <circle cx="25" cy="16" r="2" fill="white"/>
            </svg>
          </div>
          <h2 className="text-center text-3xl font-bold text-stone-900 dark:text-gray-100 tracking-tightest mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-stone-600 dark:text-gray-400">
            Sign in to your Otters account
          </p>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Otters Academy of Swimming Limited
          </p>
        </div>

        {signOutReason && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          >
            {SIGN_OUT_REASONS[signOutReason]}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or sign in with email</span>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                placeholder="••••••••••••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-dark">
              Forgot password?
            </Link>
          </div>

          <div className="text-sm text-center">
            <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <Link href="/signup" className="font-medium text-primary hover:text-primary-dark">
              Sign up here
            </Link>
          </div>

          <div className="text-sm text-center">
            <Link href="/" className="font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light">
              ← Back to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
