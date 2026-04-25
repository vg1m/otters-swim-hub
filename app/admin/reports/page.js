'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { formatKES } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

function AttendanceInfoIcon({ className = '', onOpen }) {
  return (
    <button
      type="button"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold leading-none text-current opacity-70 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label="How attendance rate is calculated (opens explanation)"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen?.()
      }}
    >
      i
    </button>
  )
}

function formatSwimmerNameFromPayment(payment) {
  const inv = payment.invoices
  if (!inv) return 'N/A'
  const sw = inv.swimmers
  if (!sw) return 'N/A'
  const row = Array.isArray(sw) ? sw[0] : sw
  if (!row) return 'N/A'
  const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
  return name || 'N/A'
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [attendanceHelpOpen, setAttendanceHelpOpen] = useState(false)
  const [dateRange, setDateRange] = useState('this_month')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingAmount: 0,
    outstandingInvoiceCount: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalSwimmers: 0,
    activeSwimmers: 0,
    totalSessions: 0,
    /** 0–100, whole number: (avg check-ins per session / active swimmers) * 100, capped, rounded */
    averageAttendancePercent: 0,
  })
  const [recentPayments, setRecentPayments] = useState([])

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cachedProfile?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    
    // Load data immediately if we have user
    if (user) {
      loadReports()
    }
  }, [user, profile, authLoading, dateRange])

  async function loadReports() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case 'this_week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'this_month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'this_quarter':
          startDate.setMonth(now.getMonth() - 3)
          break
        case 'this_year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate.setMonth(now.getMonth() - 1)
      }

      // Fetch in parallel; attendance is loaded after (scoped to same sessions as below)
      const [invoicesResult, outstandingInvoicesResult, paymentsResult, swimmersResult, sessionsResult] =
        await Promise.all([
          supabase
            .from('invoices')
            .select('*')
            .gte('created_at', startDate.toISOString()),

          // Match /admin dashboard: all open amounts (issued + due), not scoped to report date range
          supabase
            .from('invoices')
            .select('total_amount')
            .in('status', ['issued', 'due']),

          supabase
            .from('payments')
            .select(`
            *,
            invoices (
              id,
              total_amount,
              swimmers ( first_name, last_name )
            )
          `)
            .eq('status', 'completed')
            .gte('paid_at', startDate.toISOString())
            .order('paid_at', { ascending: false })
            .limit(20),

          supabase
            .from('swimmers')
            .select('id, status'),

          supabase
            .from('training_sessions')
            .select('id')
            .gte('session_date', startDate.toISOString().split('T')[0]),
        ])

      if (invoicesResult.error) throw invoicesResult.error
      if (outstandingInvoicesResult.error) throw outstandingInvoicesResult.error

      // Process invoices (date range: revenue and period summary only)
      const invoices = invoicesResult.data || []
      const paidInvoices = invoices.filter(inv => inv.status === 'paid')
      const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid')
      
      const totalRevenue = paidInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.total_amount || 0), 0
      )

      const outstandingRows = outstandingInvoicesResult.data || []
      const outstandingAmount = outstandingRows.reduce(
        (sum, inv) => sum + parseFloat(inv.total_amount || 0),
        0
      )

      // Process swimmers
      const swimmers = swimmersResult.data || []
      const activeSwimmers = swimmers.filter(s => s.status === 'approved')

      // Process sessions; count check-ins only for those sessions (same date window as session_date filter)
      const sessions = sessionsResult.data || []
      const sessionIds = sessions.map((s) => s.id)
      let attendanceRecords = []
      if (sessionIds.length > 0) {
        const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('id')
          .in('session_id', sessionIds)
        if (attErr) throw attErr
        attendanceRecords = attData || []
      }
      const totalCheckIns = attendanceRecords.length
      const totalSessions = sessions.length
      const activeCount = activeSwimmers.length
      let averageAttendancePercent = 0
      if (totalSessions > 0 && activeCount > 0) {
        const avgCheckInsPerSession = totalCheckIns / totalSessions
        averageAttendancePercent = Math.min(100, (avgCheckInsPerSession / activeCount) * 100)
        averageAttendancePercent = Math.round(averageAttendancePercent)
      }

      setStats({
        totalRevenue,
        outstandingAmount,
        outstandingInvoiceCount: outstandingRows.length,
        paidInvoices: paidInvoices.length,
        unpaidInvoices: unpaidInvoices.length,
        totalSwimmers: swimmers.length,
        activeSwimmers: activeCount,
        totalSessions: sessions.length,
        averageAttendancePercent,
      })

      // Use actual payments data for recent payments
      const payments = paymentsResult.data || []
      setRecentPayments(payments.slice(0, 10))

    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header: full-width period on mobile */}
          <div className="mb-8 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Financial Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                View payment summaries and analytics
              </p>
            </div>
            <div className="w-full sm:w-auto sm:max-w-xs">
              <label htmlFor="reports-date-range" className="sr-only">
                Report period
              </label>
              <select
                id="reports-date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] sm:min-h-0"
              >
                <option value="this_week">Last 7 days</option>
                <option value="this_month">Last 30 days</option>
                <option value="this_quarter">Last 3 months</option>
                <option value="this_year">Last year</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Card className="!p-4">
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </Card>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3">
                <Card
                  padding="normal"
                  className="!p-2.5 sm:!p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-green-700/90 dark:text-green-300/90 sm:text-[10px]">
                      Total revenue
                    </p>
                    <p className="text-lg font-bold leading-tight text-green-900 dark:text-green-100 sm:text-xl mt-0.5 break-words">
                      {formatKES(stats.totalRevenue)}
                    </p>
                    <p className="text-[9px] text-green-600 dark:text-green-400/90 mt-0.5 leading-tight">
                      {stats.paidInvoices} paid in period
                    </p>
                  </div>
                </Card>

                <Card
                  padding="normal"
                  className="!p-2.5 sm:!p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                >
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-yellow-800/90 dark:text-yellow-200/90 sm:text-[10px]">
                      Outstanding
                    </p>
                    <p className="text-lg font-bold leading-tight text-yellow-900 dark:text-yellow-100 sm:text-xl mt-0.5 break-words">
                      {formatKES(stats.outstandingAmount)}
                    </p>
                    <p className="text-[9px] text-yellow-700 dark:text-yellow-300/80 mt-0.5 leading-tight line-clamp-2">
                      {stats.outstandingInvoiceCount} open (all time)
                    </p>
                  </div>
                </Card>

                <Card
                  padding="normal"
                  className="!p-2.5 sm:!p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                >
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-blue-700/90 dark:text-blue-200/90 sm:text-[10px]">
                      Active swimmers
                    </p>
                    <p className="text-lg font-bold tabular-nums text-blue-900 dark:text-blue-100 sm:text-xl mt-0.5">
                      {stats.activeSwimmers}
                    </p>
                    <p className="text-[9px] text-blue-600 dark:text-blue-300/80 mt-0.5">of {stats.totalSwimmers} total</p>
                  </div>
                </Card>

                <Card
                  padding="normal"
                  className="!p-2.5 sm:!p-3 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 pr-0.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-purple-700/90 dark:text-purple-200/90 sm:text-[10px]">
                        Attend. rate
                      </p>
                      <AttendanceInfoIcon
                        onOpen={() => setAttendanceHelpOpen(true)}
                        className="text-purple-600 dark:text-purple-300 border-purple-300/80 dark:border-purple-500"
                      />
                    </div>
                    <p className="text-lg font-bold tabular-nums text-purple-900 dark:text-purple-100 sm:text-xl mt-0.5">
                      {stats.activeSwimmers > 0 && stats.totalSessions > 0
                        ? `${stats.averageAttendancePercent}%`
                        : 'N/A'}
                    </p>
                    <p className="text-[9px] text-purple-600 dark:text-purple-300/80 mt-0.5 leading-tight">
                      {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''} in range
                    </p>
                  </div>
                </Card>
              </div>

              <Card
                title="Recent payments"
                subtitle={`Last ${recentPayments.length} in period`}
                className="mt-5 sm:mt-6 [&_h3]:!text-sm [&_h3]:!font-semibold [&_p]:!text-xs"
              >
                {recentPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No payments recorded in this period</p>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700 -mx-1">
                      {recentPayments.map((payment) => (
                        <div key={payment.id} className="px-1 py-4 space-y-3 first:pt-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Payment
                              </p>
                              <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                                #{payment.id.slice(0, 8)}
                              </p>
                              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                                {formatSwimmerNameFromPayment(payment)}
                              </p>
                            </div>
                            <Badge variant="success" className="shrink-0">
                              {payment.status === 'completed' ? 'Paid' : payment.status}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatKES(payment.amount || payment.invoices?.total_amount)}
                          </p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Date</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {payment.paid_at ? formatDate(payment.paid_at) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Channel</span>
                              <span className="capitalize text-gray-900 dark:text-gray-100">
                                {payment.payment_channel || 'Card'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-sm">Reference</span>
                              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all mt-0.5">
                                {payment.paystack_reference || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Payment ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Swimmer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Payment Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Channel
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {recentPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                                #{payment.id.slice(0, 8)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {formatSwimmerNameFromPayment(payment)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatKES(payment.amount || payment.invoices?.total_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {payment.paid_at ? formatDate(payment.paid_at) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {payment.payment_channel || 'Card'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono max-w-xs truncate">
                                {payment.paystack_reference || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="success">
                                  {payment.status === 'completed' ? 'Paid' : payment.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
                <Card
                  title="Payment summary"
                  padding="normal"
                  className="!p-3 sm:!p-4 [&_h3]:!text-sm [&_h3]:!font-semibold"
                >
                  <div className="space-y-0 text-xs sm:text-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Total invoices</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.paidInvoices + stats.unpaidInvoices}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Paid</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">
                        {stats.paidInvoices}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Unpaid</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400 tabular-nums">
                        {stats.unpaidInvoices}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-gray-500 dark:text-gray-400">Collection rate</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.paidInvoices + stats.unpaidInvoices > 0
                          ? Math.round((stats.paidInvoices / (stats.paidInvoices + stats.unpaidInvoices)) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Activity summary"
                  padding="normal"
                  className="!p-3 sm:!p-4 [&_h3]:!text-sm [&_h3]:!font-semibold"
                >
                  <div className="space-y-0 text-xs sm:text-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Training sessions</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.totalSessions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="inline-flex min-w-0 items-center gap-0.5 text-gray-500 dark:text-gray-400">
                        <span>Attendance rate</span>
                        <AttendanceInfoIcon
                          onOpen={() => setAttendanceHelpOpen(true)}
                          className="h-4 w-4 text-gray-500 dark:text-gray-400 border-gray-400/60"
                        />
                      </span>
                      <span className="shrink-0 font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.activeSwimmers > 0 && stats.totalSessions > 0
                          ? `${stats.averageAttendancePercent}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Active swimmers</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.activeSwimmers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-gray-500 dark:text-gray-400">Approval rate</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {stats.totalSwimmers > 0
                          ? Math.round((stats.activeSwimmers / stats.totalSwimmers) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={attendanceHelpOpen}
        onClose={() => setAttendanceHelpOpen(false)}
        title="Attendance rate"
        size="md"
        footer={
          <div className="flex w-full justify-end">
            <Button type="button" variant="primary" onClick={() => setAttendanceHelpOpen(false)}>
              Got it
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p className="m-0">
            <strong className="text-gray-900 dark:text-gray-100">What you&apos;re seeing</strong>
          </p>
          <p className="m-0 pl-0 text-gray-600 dark:text-gray-400">
            Total check-in rows for sessions in your selected date range, divided by how many of those sessions ran,
            then divided by your number of <strong>active (approved) swimmers</strong>, shown as a percent (capped at
            100%).
          </p>
          <p className="m-0 pt-1">
            <strong className="text-gray-900 dark:text-gray-100">What we align</strong>
          </p>
          <p className="m-0 pl-0 text-gray-600 dark:text-gray-400">
            Check-ins are only counted when they belong to a session whose session date is in the
            period. That matches the same set of sessions as your &quot;Training sessions&quot; count. We do not use
            the day the check-in was first saved in the app to decide if it&apos;s in range.
          </p>
          <p className="m-0 pt-1">
            <strong className="text-gray-900 dark:text-gray-100">Heads up</strong>
          </p>
          <p className="m-0 pl-0 text-gray-600 dark:text-gray-400">
            Roster size is the whole approved list, not &quot;who was meant to be at each session,&quot; so the figure
            is a <em>rough</em> utilisation view. It is not a full per-session capacity or squad-perfect attendance
            rate.
          </p>
        </div>
      </Modal>

      <Footer />
    </>
  )
}
