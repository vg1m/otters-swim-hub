'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  KpiPendingIcon,
  KpiSwimmersIcon,
  KpiOutstandingIcon,
  KpiAttendanceIcon,
} from '@/components/icons/DashboardKpiIcons'
import { formatKES } from '@/lib/utils/currency'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    pendingRegistrations: 0,
    activeSwimmers: 0,
    outstandingInvoices: 0,
    weeklyAttendance: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/login')
        return
      }
      loadStats()
    }
  }, [user, profile, authLoading])

  async function loadStats() {
    const supabase = createClient()

    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      // Execute all queries in parallel for faster loading
      const [
        { count: pendingCount },
        { count: activeCount },
        { data: outstandingInvoices },
        { count: attendanceCount }
      ] = await Promise.all([
        supabase
          .from('swimmers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        supabase
          .from('swimmers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        
        supabase
          .from('invoices')
          .select('total_amount')
          .in('status', ['issued', 'due']),
        
        supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString())
      ])

      const outstandingTotal = outstandingInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0) || 0

      setStats({
        pendingRegistrations: pendingCount || 0,
        activeSwimmers: activeCount || 0,
        outstandingInvoices: outstandingTotal,
        weeklyAttendance: attendanceCount || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const quickCardClass =
    '[&>div:first-child_h3]:text-[0.9375rem] [&>div:first-child_h3]:leading-snug sm:[&>div:first-child_h3]:text-lg [&>div:first-child_p]:text-[11px] sm:[&>div:first-child_p]:text-sm'

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-5 sm:py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              Otters Kenya Academy of Swimming Limited
            </p>
          </div>

          {/* Stats — 2×2 on mobile so tiles feel like KPI chips, not full-width banners */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-8">
            <Card
              padding="sm"
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-blue-700/90 dark:text-blue-300/90 leading-tight">
                    <span className="sm:hidden">Pending</span>
                    <span className="hidden sm:inline">Pending registrations</span>
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-blue-900 dark:text-blue-100 mt-0.5 sm:mt-1 leading-none">
                    {stats.pendingRegistrations}
                  </p>
                </div>
                <KpiPendingIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-blue-500/85 dark:text-blue-400/90" />
              </div>
            </Card>

            <Card
              padding="sm"
              className="bg-green-50 dark:bg-green-900/20 border-green-200/80 dark:border-green-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-green-700/90 dark:text-green-300/90 leading-tight">
                    Active swimmers
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-green-900 dark:text-green-100 mt-0.5 sm:mt-1 leading-none">
                    {stats.activeSwimmers}
                  </p>
                </div>
                <KpiSwimmersIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-emerald-600/80 dark:text-emerald-400/85" />
              </div>
            </Card>

            <Card
              padding="sm"
              className="bg-amber-50/90 dark:bg-yellow-900/20 border-amber-200/80 dark:border-yellow-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-amber-800/90 dark:text-yellow-300/90 leading-tight">
                    Outstanding
                  </p>
                  <p className="text-[0.8125rem] sm:text-lg md:text-xl lg:text-2xl font-bold tabular-nums text-amber-950 dark:text-yellow-100 mt-0.5 sm:mt-1 leading-tight break-words">
                    {formatKES(stats.outstandingInvoices)}
                  </p>
                </div>
                <KpiOutstandingIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-amber-700/75 dark:text-amber-400/80" />
              </div>
            </Card>

            <Card
              padding="sm"
              className="bg-purple-50 dark:bg-purple-900/20 border-purple-200/80 dark:border-purple-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-purple-700/90 dark:text-purple-300/90 leading-tight">
                    <span className="sm:hidden">Check-ins (7d)</span>
                    <span className="hidden sm:inline">This week&apos;s check-ins</span>
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-purple-900 dark:text-purple-100 mt-0.5 sm:mt-1 leading-none">
                    {stats.weeklyAttendance}
                  </p>
                </div>
                <KpiAttendanceIcon className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-violet-600/78 dark:text-violet-400/85" />
              </div>
            </Card>
          </div>

          {/* Quick actions — 2 columns on phone: glanceable tiles, not six full-width panels */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 lg:gap-6">
            <Card
              padding="sm"
              title="Registrations"
              subtitle={`${stats.pendingRegistrations} pending`}
              className={`shadow-sm ${quickCardClass}`}
            >
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Approve new swimmer sign-ups
              </p>
              <Link href="/admin/registrations" className="block">
                <Button
                  fullWidth
                  size="sm"
                  variant="secondary"
                  className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5"
                >
                  View pending
                </Button>
              </Link>
            </Card>

            <Card
              padding="sm"
              title="Swimmers"
              subtitle={`${stats.activeSwimmers} active`}
              className={`shadow-sm ${quickCardClass}`}
            >
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Roster and swimmer details
              </p>
              <Link href="/admin/swimmers" className="block">
                <Button fullWidth size="sm" variant="secondary" className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5">
                  Manage
                </Button>
              </Link>
            </Card>

            <Card padding="sm" title="Sessions" subtitle="Schedule" className={`shadow-sm ${quickCardClass}`}>
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Training times & attendance
              </p>
              <Link href="/admin/sessions" className="block">
                <Button fullWidth size="sm" variant="secondary" className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5">
                  Pool schedule
                </Button>
              </Link>
            </Card>

            <Card padding="sm" title="Invoices" subtitle="Payments" className={`shadow-sm ${quickCardClass}`}>
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Paystack & billing
              </p>
              <Link href="/admin/invoices" className="block">
                <Button fullWidth size="sm" variant="secondary" className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5">
                  Invoices
                </Button>
              </Link>
            </Card>

            <Card padding="sm" title="Meets" subtitle="Competitions" className={`shadow-sm ${quickCardClass}`}>
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Meets & entries
              </p>
              <Link href="/admin/meets" className="block">
                <Button fullWidth size="sm" variant="secondary" className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5">
                  Meets
                </Button>
              </Link>
            </Card>

            <Card padding="sm" title="Reports" subtitle="Finance" className={`shadow-sm ${quickCardClass}`}>
              <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 leading-snug line-clamp-3 sm:line-clamp-none">
                Summaries & analytics
              </p>
              <Link href="/admin/reports" className="block">
                <Button fullWidth size="sm" variant="secondary" className="min-h-[44px] text-xs sm:text-sm sm:min-h-0 sm:py-1.5">
                  Reports
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}