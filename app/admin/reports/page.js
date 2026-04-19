'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatKES } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

function formatSwimmerNameFromPayment(payment) {
  const inv = payment.invoices
  if (!inv) return '—'
  const sw = inv.swimmers
  if (!sw) return '—'
  const row = Array.isArray(sw) ? sw[0] : sw
  if (!row) return '—'
  const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
  return name || '—'
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
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
    averageAttendance: 0,
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

      // Fetch all data in parallel
      const [
        invoicesResult,
        outstandingInvoicesResult,
        paymentsResult,
        swimmersResult,
        sessionsResult,
        attendanceResult
      ] = await Promise.all([
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
        
        supabase
          .from('attendance')
          .select('id')
          .gte('created_at', startDate.toISOString())
      ])

      if (invoicesResult.error) throw invoicesResult.error
      if (outstandingInvoicesResult.error) throw outstandingInvoicesResult.error

      // Process invoices (date range — for revenue & period summary only)
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

      // Process sessions and attendance
      const sessions = sessionsResult.data || []
      const attendanceRecords = attendanceResult.data || []
      const averageAttendance = sessions.length > 0 
        ? Math.round(attendanceRecords.length / sessions.length) 
        : 0

      setStats({
        totalRevenue,
        outstandingAmount,
        outstandingInvoiceCount: outstandingRows.length,
        paidInvoices: paidInvoices.length,
        unpaidInvoices: unpaidInvoices.length,
        totalSwimmers: swimmers.length,
        activeSwimmers: activeSwimmers.length,
        totalSessions: sessions.length,
        averageAttendance,
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
          {/* Header — full-width period on mobile */}
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
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            </Card>
          ) : (
            <>
              {/* Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <Card padding="normal" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                      {formatKES(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {stats.paidInvoices} paid invoices
                    </p>
                  </div>
                </Card>

                <Card padding="normal" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Outstanding</p>
                    <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
                      {formatKES(stats.outstandingAmount)}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {stats.outstandingInvoiceCount} invoice{stats.outstandingInvoiceCount !== 1 ? 's' : ''} (issued or due), all time
                    </p>
                  </div>
                </Card>

                <Card padding="normal" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Active Swimmers</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                      {stats.activeSwimmers}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      of {stats.totalSwimmers} total
                    </p>
                  </div>
                </Card>

                <Card padding="normal" className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Avg Attendance</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                      {stats.averageAttendance}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      per session ({stats.totalSessions} sessions)
                    </p>
                  </div>
                </Card>
              </div>

              {/* Recent Payments */}
              <Card title="Recent Payments" subtitle={`Last ${recentPayments.length} payments`}>
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

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-8">
                <Card title="Payment Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Total Invoices</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.paidInvoices + stats.unpaidInvoices}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Paid Invoices</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {stats.paidInvoices}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Unpaid Invoices</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                        {stats.unpaidInvoices}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 dark:text-gray-400">Collection Rate</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.paidInvoices + stats.unpaidInvoices > 0
                          ? Math.round((stats.paidInvoices / (stats.paidInvoices + stats.unpaidInvoices)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </Card>

                <Card title="Activity Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Training Sessions</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.totalSessions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Average Attendance</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.averageAttendance} swimmers
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Active Swimmers</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.activeSwimmers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 dark:text-gray-400">Approval Rate</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {stats.totalSwimmers > 0
                          ? Math.round((stats.activeSwimmers / stats.totalSwimmers) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
