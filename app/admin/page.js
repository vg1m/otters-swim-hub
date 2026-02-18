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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Otters Kenya Swim Club Management</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card padding="normal" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Pending Registrations</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats.pendingRegistrations}</p>
                </div>
                <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
            </Card>

            <Card padding="normal" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Active Swimmers</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{stats.activeSwimmers}</p>
                </div>
                <svg className="w-12 h-12 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
              </div>
            </Card>

            <Card padding="normal" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Outstanding</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">{formatKES(stats.outstandingInvoices)}</p>
                </div>
                <svg className="w-12 h-12 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
            </Card>

            <Card padding="normal" className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">This Week's Check-ins</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{stats.weeklyAttendance}</p>
                </div>
                <svg className="w-12 h-12 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Pending Registrations" subtitle={`${stats.pendingRegistrations} awaiting approval`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Review and approve new swimmer registrations
              </p>
              <Link href="/admin/registrations">
                <Button fullWidth>View Pending</Button>
              </Link>
            </Card>

            <Card title="Swimmer Management" subtitle={`${stats.activeSwimmers} active swimmers`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage all registered swimmers and their details
              </p>
              <Link href="/admin/swimmers">
                <Button fullWidth variant="secondary">Manage Swimmers</Button>
              </Link>
            </Card>

            <Card title="Training Sessions" subtitle="Schedule & QR codes">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create training sessions and manage attendance
              </p>
              <Link href="/admin/sessions">
                <Button fullWidth variant="secondary">Pool Schedule</Button>
              </Link>
            </Card>

            <Card title="Invoices" subtitle="Generate & track payments">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create invoices and track payment status via Paystack
              </p>
              <Link href="/admin/invoices">
                <Button fullWidth variant="secondary">Manage Invoices</Button>
              </Link>
            </Card>

            <Card title="Meets" subtitle="Competition management">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create meets and manage swimmer registrations
              </p>
              <Link href="/admin/meets">
                <Button fullWidth variant="secondary">Manage Meets</Button>
              </Link>
            </Card>

            <Card title="Reports" subtitle="Financial summaries">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                View payment reports and Paystack analytics
              </p>
              <Link href="/admin/reports">
                <Button fullWidth variant="secondary">View Reports</Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}