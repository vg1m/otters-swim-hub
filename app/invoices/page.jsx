'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatKES } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

function InvoicesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  // Check if user just returned from Paystack payment
  const reference = searchParams.get('reference')
  const paid = searchParams.get('paid') === 'true'

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      loadInvoices()
      
      // If user just returned from payment, verify and refresh
      if (paid && reference) {
        verifyPaymentStatus(reference)
      }
    }
  }, [user, authLoading, router, paid, reference])

  async function verifyPaymentStatus(reference) {
    setVerifyingPayment(true)
    toast.loading('Verifying payment with Paystack...', { id: 'verify-payment' })
    
    try {
      // Call verification API
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      })

      const result = await response.json()

      if (!response.ok) {
        // If verification failed, poll database for a few seconds in case webhook completed it
        console.log('API verification failed, polling database...', result)
        await pollDatabaseStatus(reference)
        return
      }

      // Success!
      toast.dismiss('verify-payment')
      toast.success('Payment confirmed! Your registration is now active.')
      setVerifyingPayment(false)
      
      // Reload invoices and clear URL params
      await loadInvoices()
      router.replace('/invoices')

    } catch (error) {
      console.error('Payment verification error:', error)
      // Fallback to polling database
      await pollDatabaseStatus(reference)
    }
  }

  async function pollDatabaseStatus(reference) {
    let attempts = 0
    const maxAttempts = 5
    
    const poll = async () => {
      try {
        const supabase = createClient()
        
        const { data: payment, error } = await supabase
          .from('payments')
          .select('status, invoice_id, invoices(status)')
          .eq('paystack_reference', reference)
          .single()

        if (!error && payment?.status === 'completed' && payment.invoices?.status === 'paid') {
          toast.dismiss('verify-payment')
          toast.success('Payment confirmed! Your registration is now active.')
          setVerifyingPayment(false)
          await loadInvoices()
          router.replace('/invoices')
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          toast.dismiss('verify-payment')
          toast('Payment is being processed. Please refresh in a moment.', {
            icon: 'ℹ️',
            duration: 5000
          })
          setVerifyingPayment(false)
          await loadInvoices()
          router.replace('/invoices')
        }
      } catch (error) {
        console.error('Database poll error:', error)
        toast.dismiss('verify-payment')
        toast.error('Error verifying payment')
        setVerifyingPayment(false)
      }
    }
    
    poll()
  }

  async function loadInvoices() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Get invoices first (don't rely on swimmer join since swimmer_id might be NULL)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, invoice_line_items (*)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      // For each invoice, find swimmer name from line items or parent's swimmers
      const enrichedInvoices = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          // If invoice has swimmer_id, fetch that swimmer
          if (invoice.swimmer_id) {
            const { data: swimmer } = await supabase
              .from('swimmers')
              .select('first_name, last_name')
              .eq('id', invoice.swimmer_id)
              .single()
            
            return {
              ...invoice,
              swimmers: swimmer
            }
          }
          
          // Otherwise, get swimmer name from line items description
          const firstLineItem = invoice.invoice_line_items?.[0]
          const swimmerName = firstLineItem?.description?.replace('Registration: ', '') || 'Swimmer'
          
          return {
            ...invoice,
            swimmers: {
              first_name: swimmerName.split(' ')[0] || 'Swimmer',
              last_name: swimmerName.split(' ').slice(1).join(' ') || 'Registration'
            }
          }
        })
      )

      setInvoices(enrichedInvoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  function viewInvoiceDetails(invoice) {
    setSelectedInvoice(invoice)
    setShowDetailsModal(true)
  }

  async function handlePayNow(invoiceId) {
    try {
      const response = await fetch('/api/paystack/pay-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack checkout
      toast.success('Redirecting to secure payment page...')
      setTimeout(() => {
        window.location.href = data.authorization_url
      }, 1000)
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Failed to initialize payment')
    }
  }

  async function downloadReceipt(invoiceId) {
    try {
      toast.loading('Generating receipt...')
      
      const response = await fetch(`/api/receipts/${invoiceId}/download`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to generate receipt')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${invoiceId.substring(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.dismiss()
      toast.success('Receipt downloaded successfully')
    } catch (error) {
      toast.dismiss()
      console.error('Download error:', error)
      toast.error('Failed to download receipt')
    }
  }

  const columns = [
    {
      header: 'Invoice ID',
      accessor: 'id',
      render: (row) => (
        <span className="font-mono text-sm">{row.id.substring(0, 8)}</span>
      ),
    },
    {
      header: 'Swimmer',
      accessor: 'swimmer',
      render: (row) => (
        <span>{row.swimmers?.first_name} {row.swimmers?.last_name}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'total_amount',
      render: (row) => (
        <span className="font-semibold">{formatKES(row.total_amount)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const variants = {
          draft: 'default',
          issued: 'info',
          due: 'warning',
          paid: 'success',
        }
        return <Badge variant={variants[row.status]}>{row.status.toUpperCase()}</Badge>
      },
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => {
        const dueDate = new Date(row.due_date)
        const isOverdue = dueDate < new Date() && row.status !== 'paid'
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {formatDate(row.due_date)}
          </span>
        )
      },
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => formatDate(row.created_at),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            className="text-primary hover:text-primary-dark font-medium text-sm"
            onClick={() => viewInvoiceDetails(row)}
          >
            View
          </button>
          {(row.status === 'issued' || row.status === 'due') && (
            <button
              onClick={() => handlePayNow(row.id)}
              className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark text-sm font-medium transition-colors"
            >
              Pay Now
            </button>
          )}
          {row.status === 'paid' && (
            <button
              onClick={() => downloadReceipt(row.id)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Receipt
            </button>
          )}
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

  const outstandingTotal = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0)

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Invoices</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage your payment invoices</p>
            
            {/* Payment Verification Alert */}
            {verifyingPayment && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <div className="flex items-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Verifying your payment with Paystack...
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      This may take a few moments. Please don't close this page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-primary">{formatKES(outstandingTotal)}</p>
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {invoices.filter(inv => inv.status !== 'paid').length}
                </p>
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Paid Invoices</p>
                <p className="text-2xl font-bold text-secondary">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
            </Card>
          </div>

          {/* Invoices Table */}
          <Card padding="none">
            <Table
              columns={columns}
              data={invoices}
              emptyMessage="No invoices found"
            />
          </Card>
        </div>
      </div>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedInvoice.id.substring(0, 8)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <Badge variant={
                    { draft: 'default', issued: 'info', due: 'warning', paid: 'success' }[selectedInvoice.status]
                  }>
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Swimmer</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedInvoice.swimmers?.first_name} {selectedInvoice.swimmers?.last_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.due_date)}</p>
              </div>
              {selectedInvoice.paid_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paid At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.paid_at)}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Line Items</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-sm font-medium text-gray-700 py-2">Description</th>
                    <th className="text-right text-sm font-medium text-gray-700 py-2">Amount</th>
                    <th className="text-right text-sm font-medium text-gray-700 py-2">Qty</th>
                    <th className="text-right text-sm font-medium text-gray-700 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.invoice_line_items?.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="text-sm text-gray-900 py-2">{item.description}</td>
                      <td className="text-sm text-gray-900 py-2 text-right">{formatKES(item.amount)}</td>
                      <td className="text-sm text-gray-900 py-2 text-right">{item.quantity}</td>
                      <td className="text-sm text-gray-900 py-2 text-right font-semibold">
                        {formatKES(item.amount * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-4 border-t-2">
                <span className="font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatKES(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>

            {selectedInvoice.status !== 'paid' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Payment with Paystack will be available soon. 
                  Please contact the club administrator for alternative payment methods.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Footer />
    </>
  )
}

export default function ParentInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <InvoicesPageContent />
    </Suspense>
  )
}
