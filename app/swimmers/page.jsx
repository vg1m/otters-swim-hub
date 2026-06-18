'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SwimmerCard from '@/components/parent/SwimmerCard'
import { loadParentSwimmerOverview } from '@/lib/parent/load-parent-swimmer-overview'
import { useRefreshOnVisible } from '@/hooks/useRefreshOnVisible'
import toast from 'react-hot-toast'

export default function SwimmersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [attendanceBySwimmer, setAttendanceBySwimmer] = useState({})
  const [loading, setLoading] = useState(true)

  const loadSwimmers = useCallback(async ({ silent = false } = {}) => {
    const supabase = createClient()
    if (!silent) setLoading(true)

    try {
      const overview = await loadParentSwimmerOverview(supabase, user.id)
      setSwimmers(overview.swimmers)
      setUpcomingSessions(overview.upcomingSessions)
      setScheduledSessions(overview.scheduledSessions)
      setAttendanceBySwimmer(overview.attendanceBySwimmer)
    } catch (error) {
      console.error('Error loading swimmers:', error)
      toast.error('Failed to load swimmers')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      loadSwimmers()
    }
  }, [user, authLoading, router, loadSwimmers])

  useRefreshOnVisible(() => loadSwimmers({ silent: true }), Boolean(user?.id))

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      <Navigation />

      <div className="bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 pb-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">My Swimmers</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
                Progress, race times, coach notes, and training attendance in one place.
              </p>
            </div>
            <Link href="/register" className="shrink-0">
              <Button size="sm" variant="secondary">
                + Add Swimmer
              </Button>
            </Link>
          </div>

          {swimmers.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">You don&apos;t have any registered swimmers yet.</p>
                <Link href="/register">
                  <Button className="mt-4" size="sm">
                    Register a Swimmer
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {swimmers.map((swimmer) => (
                <SwimmerCard
                  key={swimmer.id}
                  swimmer={swimmer}
                  sessions={upcomingSessions}
                  scheduledSessions={scheduledSessions}
                  attendance={attendanceBySwimmer[swimmer.id] || []}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
