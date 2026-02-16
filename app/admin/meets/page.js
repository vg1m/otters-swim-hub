'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'
import { profileCache } from '@/lib/cache/profile-cache'

export default function MeetsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [meets, setMeets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cachedProfile?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    
    // Load data immediately if we have user (even if profile still loading)
    if (user && !meets.length) {
      loadMeets()
    }
  }, [user, profile, authLoading])

  async function loadMeets() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('meets')
        .select(`
          *,
          meet_registrations (
            id,
            swimmer_id
          )
        `)
        .order('meet_date', { ascending: false })

      if (error) {
        console.error('Error loading meets:', error)
        // If table doesn't exist yet, just show empty state
        setMeets([])
      } else {
        setMeets(data || [])
      }
    } catch (error) {
      console.error('Error loading meets:', error)
      setMeets([])
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(() => [
    {
      header: 'Meet Name',
      accessor: 'name',
      render: (meet) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{meet.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{meet.location}</p>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'meet_date',
      render: (meet) => formatDate(meet.meet_date),
    },
    {
      header: 'Type',
      accessor: 'meet_type',
      render: (meet) => (
        <Badge variant={meet.meet_type === 'championship' ? 'primary' : 'default'}>
          {meet.meet_type?.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Registrations',
      accessor: 'registrations',
      render: (meet) => (
        <span className="text-gray-900 dark:text-gray-100">
          {meet.meet_registrations?.length || 0}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (meet) => {
        const today = new Date()
        const meetDate = new Date(meet.meet_date)
        const isUpcoming = meetDate >= today
        
        return (
          <Badge variant={isUpcoming ? 'success' : 'default'}>
            {isUpcoming ? 'Upcoming' : 'Past'}
          </Badge>
        )
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (meet) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">
            View Details
          </Button>
        </div>
      ),
    },
  ], [])

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
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Meets Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage swimming competitions and registrations</p>
            </div>
            <Link href="/admin/meets/upload">
              <Button>Upload Meet Results</Button>
            </Link>
          </div>

          {loading ? (
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            </Card>
          ) : meets.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No meets found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating a new meet or uploading meet results.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/admin/meets/upload">
                    <Button>Upload Meet Results</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <Table
                columns={columns}
                data={meets}
              />
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
