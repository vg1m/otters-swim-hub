'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatKES, EARLY_BIRD_DISCOUNT } from '@/lib/utils/currency'
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
      // Get invoices including line items and squad early_bird_eligible for discount logic
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, invoice_line_items (*)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      // For each invoice, find swimmer name from line items or parent's swimmers
      const enrichedInvoices = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          // If invoice has swimmer_id, fetch that swimmer (include squad for early bird check)
          if (invoice.swimmer_id) {
            const { data: swimmer } = await supabase
              .from('swimmers')
              .select('first_name, last_name, squad_id, squads(early_bird_eligible)')
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

  // Returns the early bird discount amount (KES) if this invoice qualifies today, else 0.
  function getEarlyBirdDiscount(invoice) {
    if (invoice.status === 'paid') return 0
    const today = new Date().getDate()
    if (today > 3) return 0
    const hasMonthlyTraining = invoice.invoice_line_items?.some(
      (item) => item.fee_type === 'monthly_training'
    )
    const squadEligible = invoice.swimmers?.squads?.early_bird_eligible === true
    return hasMonthlyTraining && squadEligible ? EARLY_BIRD_DISCOUNT : 0
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

      if (data.earlyBirdApplied) {
        toast.success(`Early bird discount applied — saving ${formatKES(data.earlyBirdDiscount)}!`)
      } else {
        toast.success('Redirecting to secure payment page...')
      }
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

  const statusVariants = {
    draft: 'default',
    issued: 'info',
    due: 'warning',
    paid: 'success',
  }

  const columns = [
    {
      header: 'Invoice ID',
      accessor: 'id',
      render: (row) => (
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {row.id.substring(0, 8)}
        </span>
      ),
    },
    {
      header: 'Swimmer',
      accessor: 'swimmer',
      render: (row) => (
        <span className="text-gray-900 dark:text-gray-100">
          {row.swimmers?.first_name} {row.swimmers?.last_name}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'total_amount',
      render: (row) => {
        const discount = getEarlyBirdDiscount(row)
        return (
          <div>
            {discount > 0 ? (
              <>
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {formatKES(Number(row.total_amount) - discount)}
                </span>
                <span className="ml-1 text-xs line-through text-gray-400">{formatKES(row.total_amount)}</span>
                <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-medium">Early bird</span>
              </>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatKES(row.total_amount)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant={statusVariants[row.status]}>{row.status.toUpperCase()}</Badge>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => {
        const dueDate = new Date(row.due_date)
        const isOverdue = dueDate < new Date() && row.status !== 'paid'
        return (
          <span
            className={
              isOverdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-900 dark:text-gray-100'
            }
          >
            {formatDate(row.due_date)}
          </span>
        )
      },
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-gray-900 dark:text-gray-100">{formatDate(row.created_at)}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary font-medium text-sm"
            onClick={() => viewInvoiceDetails(row)}
          >
            View
          </button>
          {(row.status === 'issued' || row.status === 'due') && (() => {
            const discount = getEarlyBirdDiscount(row)
            const payAmount = Number(row.total_amount) - discount
            return (
              <div className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => handlePayNow(row.id)}
                  className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark text-sm font-medium transition-colors"
                >
                  Pay {formatKES(payAmount)}
                </button>
                {discount > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Discount valid until 3rd
                  </span>
                )}
              </div>
            )
          })()}
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
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
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
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

          {/* Early bird banner — shown when at least one invoice qualifies today */}
          {invoices.some(inv => getEarlyBirdDiscount(inv) > 0) && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Early bird discount active — save {formatKES(EARLY_BIRD_DISCOUNT)}!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Pay your outstanding invoice(s) before the 3rd of this month to receive the discount automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-primary dark:text-primary-light">
                  {formatKES(outstandingTotal)}
                </p>
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {invoices.filter(inv => inv.status !== 'paid').length}
                </p>
              </div>
            </Card>
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paid Invoices</p>
                <p className="text-2xl font-bold text-secondary dark:text-secondary-light">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
            </Card>
          </div>

          {/* Invoices: mobile cards + desktop table */}
          <Card padding="none">
            <div className="md:hidden">
              {invoices.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No invoices found
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((row) => {
                    const discount = getEarlyBirdDiscount(row)
                    const payAmount = Number(row.total_amount) - discount
                    const dueDate = new Date(row.due_date)
                    const isOverdue = dueDate < new Date() && row.status !== 'paid'
                    const canPay = row.status === 'issued' || row.status === 'due'
                    return (
                      <div key={row.id} className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Invoice
                            </p>
                            <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {row.id.substring(0, 8)}
                            </p>
                            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                              {row.swimmers?.first_name} {row.swimmers?.last_name}
                            </p>
                          </div>
                          <Badge variant={statusVariants[row.status]} className="shrink-0">
                            {row.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Amount</span>
                            <div className="text-right">
                              {discount > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-semibold text-green-700 dark:text-green-400">
                                    {formatKES(payAmount)}
                                  </span>
                                  <span className="text-xs line-through text-gray-400 dark:text-gray-500">
                                    {formatKES(row.total_amount)}
                                  </span>
                                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                    Early bird
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {formatKES(row.total_amount)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Due</span>
                            <span
                              className={
                                isOverdue
                                  ? 'font-medium text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-gray-100'
                              }
                            >
                              {formatDate(row.due_date)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Created</span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {formatDate(row.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-1">
                          <Button
                            fullWidth
                            variant="secondary"
                            size="sm"
                            onClick={() => viewInvoiceDetails(row)}
                          >
                            View details
                          </Button>
                          {canPay && (
                            <>
                              <Button fullWidth size="sm" onClick={() => handlePayNow(row.id)}>
                                Pay {formatKES(payAmount)}
                              </Button>
                              {discount > 0 && (
                                <p className="text-center text-xs text-green-600 dark:text-green-400">
                                  Early bird discount valid until the 3rd
                                </p>
                              )}
                            </>
                          )}
                          {row.status === 'paid' && (
                            <Button
                              fullWidth
                              variant="success"
                              size="sm"
                              onClick={() => downloadReceipt(row.id)}
                            >
                              Download receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <Table
                columns={columns}
                data={invoices}
                emptyMessage="No invoices found"
              />
            </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice ID</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {selectedInvoice.id.substring(0, 8)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">
                  <Badge variant={
                    { draft: 'default', issued: 'info', due: 'warning', paid: 'success' }[selectedInvoice.status]
                  }>
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Swimmer</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {selectedInvoice.swimmers?.first_name} {selectedInvoice.swimmers?.last_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(selectedInvoice.due_date)}
                </p>
              </div>
              {selectedInvoice.paid_at && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid At</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedInvoice.paid_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Line Items</h3>
              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                        Description
                      </th>
                      <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                        Amount
                      </th>
                      <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                        Qty
                      </th>
                      <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.invoice_line_items?.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="text-sm text-gray-900 dark:text-gray-100 py-2">{item.description}</td>
                        <td className="text-sm text-gray-900 dark:text-gray-100 py-2 text-right">
                          {formatKES(item.amount)}
                        </td>
                        <td className="text-sm text-gray-900 dark:text-gray-100 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="text-sm text-gray-900 dark:text-gray-100 py-2 text-right font-semibold">
                          {formatKES(item.amount * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                <span className="font-bold text-gray-900 dark:text-gray-100">Total:</span>
                <span className="text-2xl font-bold text-primary dark:text-primary-light">
                  {formatKES(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>

            {selectedInvoice.status !== 'paid' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <InvoicesPageContent />
    </Suspense>
  )
}
