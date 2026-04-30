'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SetPasswordAfterInvitePage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        //
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not save password')
      }

      toast.success('Password saved. Welcome!')
      window.location.assign(data.next || '/dashboard')
    } catch (error) {
      toast.error(error?.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-soft border border-transparent dark:border-gray-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Finish your Otters coach account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Choose a password to secure your dashboard sign-in.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <input
              id="pwd"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="pwd2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              id="pwd2"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save password and continue'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
