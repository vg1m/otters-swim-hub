'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CoachSessionPayDetails from '@/components/coach/CoachSessionPayDetails'
import toast from 'react-hot-toast'

export default function CoachEarningsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [perSessionRateKes, setPerSessionRateKes] = useState(null)
  const [payEvents, setPayEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'coach') {
        router.push('/login')
        return
      }
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (!user?.id || profile?.role !== 'coach') return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      const supabase = createClient()
      try {
        const { data: rateRow, error: rateErr } = await supabase
          .from('profiles')
          .select('per_session_rate_kes')
          .eq('id', user.id)
          .single()
        if (!cancelled) {
          if (rateErr) console.warn('Coach rate load:', rateErr)
          setPerSessionRateKes(rateRow?.per_session_rate_kes ?? null)
        }

        const { data: payRows, error: payErr } = await supabase
          .from('coach_session_pay_events')
          .select(
            `
          id,
          amount_kes,
          rate_snapshot_kes,
          created_at,
          training_sessions (
            session_date,
            start_time,
            end_time,
            pool_location
          )
        `
          )
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500)
        if (!cancelled) {
          if (payErr) {
            console.warn('Coach pay events load:', payErr)
            setPayEvents([])
          } else {
            setPayEvents(payRows || [])
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) toast.error('Failed to load earnings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, profile?.role])

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Loading…</p>
          </div>
        </div>
      </>
    )
  }

  if (!user || profile?.role !== 'coach') {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 sm:mb-6">
            <Link
              href="/coach"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <span aria-hidden>←</span> Back to dashboard
            </Link>
            <h1 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              What you earn per session
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Your roster rate and every pay line recorded for you (newest first). Open this page any time from
              the earnings card on your coach dashboard.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <CoachSessionPayDetails perSessionRateKes={perSessionRateKes} payEvents={payEvents} layout="page" />
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
