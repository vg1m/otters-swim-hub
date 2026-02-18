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
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function PendingRegistrationsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSwimmer, setSelectedSwimmer] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
    if (user && !swimmers.length) {
      loadPendingSwimmers()
    }
  }, [user, profile, authLoading])

  async function loadPendingSwimmers() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Get pending swimmers
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (swimmersError) throw swimmersError

      // For each swimmer, find their invoice through parent_id or payment callback_data
      const swimmersWithInvoices = await Promise.all(
        (swimmersData || []).map(async (swimmer) => {
          // Try to find invoice by parent_id
          let invoice = null
          
          if (swimmer.parent_id) {
            // For linked swimmers, find by parent_id
            const { data: invoiceData } = await supabase
              .from('invoices')
              .select('id, status, total_amount, paid_at')
              .eq('parent_id', swimmer.parent_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            invoice = invoiceData
          } else {
            // For orphaned swimmers, find through payments callback_data
            const { data: paymentData } = await supabase
              .from('payments')
              .select('invoice_id, invoices(id, status, total_amount, paid_at)')
              .contains('callback_data->swimmers', [swimmer.id])
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            invoice = paymentData?.invoices
          }

          return {
            ...swimmer,
            invoices: invoice ? [invoice] : []
          }
        })
      )

      setSwimmers(swimmersWithInvoices)
    } catch (error) {
      console.error('Error loading swimmers:', error)
      toast.error('Failed to load pending registrations')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(swimmer) {
    if (!confirm(`Approve registration for ${swimmer.first_name} ${swimmer.last_name}?`)) {
      return
    }

    setActionLoading(true)
    const supabase = createClient()

    try {
      // Update swimmer status to approved
      const { error: swimmerError } = await supabase
        .from('swimmers')
        .update({ status: 'approved' })
        .eq('id', swimmer.id)

      if (swimmerError) throw swimmerError

      toast.success('Swimmer approved successfully!')
      loadPendingSwimmers()
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error approving swimmer:', error)
      toast.error('Failed to approve swimmer')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(swimmer) {
    const reason = prompt('Enter rejection reason (optional):')
    if (reason === null) return // User cancelled

    setActionLoading(true)
    const supabase = createClient()

    try {
      // Update swimmer status to inactive/rejected
      const { error: swimmerError } = await supabase
        .from('swimmers')
        .update({ 
          status: 'inactive',
          // Could add a rejection_reason field to schema if needed
        })
        .eq('id', swimmer.id)

      if (swimmerError) throw swimmerError

      toast.success('Registration rejected')
      loadPendingSwimmers()
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error rejecting swimmer:', error)
      toast.error('Failed to reject registration')
    } finally {
      setActionLoading(false)
    }
  }

  function viewDetails(swimmer) {
    setSelectedSwimmer(swimmer)
    setShowDetailsModal(true)
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {row.first_name} {row.last_name}
          </p>
        </div>
      ),
    },
    {
      header: 'Age',
      accessor: 'age',
      render: (row) => calculateAge(row.date_of_birth),
    },
    {
      header: 'Gender',
      accessor: 'gender',
      render: (row) => (
        <span className="capitalize">{row.gender}</span>
      ),
    },
    {
      header: 'Squad',
      accessor: 'squad',
      render: (row) => (
        <Badge variant="info">
          {row.squad.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'payment',
      render: (row) => {
        const invoice = row.invoices?.[0]
        if (!invoice) return <Badge variant="warning">No Invoice</Badge>
        if (invoice.status === 'paid') return <Badge variant="success">Paid</Badge>
        return <Badge variant="warning">{invoice.status}</Badge>
      },
    },
    {
      header: 'Registered',
      accessor: 'created_at',
      render: (row) => formatDate(row.created_at),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => viewDetails(row)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="success"
            onClick={() => handleApprove(row)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleReject(row)}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ]

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pending Registrations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Review and approve new swimmer registrations
            </p>
          </div>

          <Card padding="none">
            {swimmers.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No pending registrations</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  All registrations have been processed.
                </p>
              </div>
            ) : (
              <Table columns={columns} data={swimmers} />
            )}
          </Card>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Swimmer Details"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDetailsModal(false)}
              disabled={actionLoading}
            >
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReject(selectedSwimmer)}
              loading={actionLoading}
            >
              Reject
            </Button>
            <Button
              variant="success"
              onClick={() => handleApprove(selectedSwimmer)}
              loading={actionLoading}
            >
              Approve
            </Button>
          </div>
        }
      >
        {selectedSwimmer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedSwimmer.first_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedSwimmer.last_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(selectedSwimmer.date_of_birth)} ({calculateAge(selectedSwimmer.date_of_birth)} years old)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">{selectedSwimmer.gender}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Squad</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedSwimmer.squad.replace('_', ' ').toUpperCase()}</p>
              </div>
              {selectedSwimmer.sub_squad && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sub Squad</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 uppercase">{selectedSwimmer.sub_squad}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Registration Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedSwimmer.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</label>
                <div className="mt-1">
                  {selectedSwimmer.invoices?.[0] ? (
                    <Badge variant={selectedSwimmer.invoices[0].status === 'paid' ? 'success' : 'warning'}>
                      {selectedSwimmer.invoices[0].status.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="danger">No Invoice</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </>
  )
}
