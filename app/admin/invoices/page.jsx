'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatKES } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

/** Matches `invoice_line_items.fee_type` CHECK (migrations 041 + 055). */
const LINE_ITEM_FEE_TYPES = [
  { value: 'monthly_training', label: 'Monthly training' },
  { value: 'quarterly_training', label: 'Quarterly training' },
  { value: 'registration', label: 'Registration' },
  { value: 'drop_in', label: 'Drop-in' },
  { value: 'early_bird_discount', label: 'Early bird discount' },
]

function invoiceErrorMessage(error) {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.error_description) return error.error_description
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

const INVOICE_STATUS_VARIANTS = {
  draft: 'default',
  issued: 'info',
  due: 'warning',
  paid: 'success',
}

/** Lowercased concatenation of all fields admins might type in the search bar (client-side only; not Elasticsearch). */
function invoiceSearchHaystack(row) {
  const swimmer = `${row.swimmers?.first_name || ''} ${row.swimmers?.last_name || ''}`.trim()
  const payment = row.payments?.[0]
  const lineBits =
    row.invoice_line_items?.flatMap((item) => [
      item.description,
      item.fee_type,
      item.amount != null ? String(item.amount) : '',
    ]) ?? []
  const parts = [
    row.id,
    row.id?.replace(/-/g, ''),
    swimmer,
    row.status,
    row.total_amount != null ? String(row.total_amount) : '',
    row.due_date,
    row.created_at,
    payment?.paystack_reference,
    payment?.payment_channel,
    payment?.status,
    ...lineBits,
    row.due_date ? formatDate(row.due_date) : '',
    row.created_at ? formatDate(row.created_at) : '',
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function filterInvoicesBySearch(invoices, query) {
  const q = query.trim().toLowerCase()
  if (!q) return invoices
  const tokens = q.split(/\s+/).filter(Boolean)
  return invoices.filter((row) => {
    const haystack = invoiceSearchHaystack(row)
    return tokens.every((t) => haystack.includes(t))
  })
}

export default function InvoicesPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [swimmers, setSwimmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [invoiceForm, setInvoiceForm] = useState({
    swimmer_id: '',
    due_date: '',
    line_items: [{ description: '', amount: '', quantity: 1, fee_type: 'monthly_training' }],
  })
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const filteredInvoices = useMemo(
    () => filterInvoicesBySearch(invoices, invoiceSearch),
    [invoices, invoiceSearch]
  )

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
    if (user && !invoices.length && !swimmers.length) {
      Promise.all([loadInvoices(), loadSwimmers()])
    }
  }, [user, profile, authLoading])

  async function loadInvoices() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          swimmers (first_name, last_name),
          invoice_line_items (*),
          payments (
            id,
            status,
            payment_channel,
            paystack_reference,
            paid_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  async function loadSwimmers() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('id, first_name, last_name, parent_id')
        .eq('status', 'approved')
        .order('last_name', { ascending: true })

      if (error) throw error
      setSwimmers(data || [])
    } catch (error) {
      console.error('Error loading swimmers:', error)
    }
  }

  function addLineItem() {
    setInvoiceForm({
      ...invoiceForm,
      line_items: [
        ...invoiceForm.line_items,
        { description: '', amount: '', quantity: 1, fee_type: 'monthly_training' },
      ],
    })
  }

  function removeLineItem(index) {
    const newItems = invoiceForm.line_items.filter((_, i) => i !== index)
    setInvoiceForm({ ...invoiceForm, line_items: newItems })
  }

  function updateLineItem(index, field, value) {
    const newItems = [...invoiceForm.line_items]
    newItems[index][field] = value
    setInvoiceForm({ ...invoiceForm, line_items: newItems })
  }

  function calculateTotal() {
    return invoiceForm.line_items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0) * (parseInt(item.quantity) || 0)
    }, 0)
  }

  async function handleCreateInvoice() {
    if (!invoiceForm.swimmer_id || !invoiceForm.due_date) {
      toast.error('Please select swimmer and due date')
      return
    }

    if (invoiceForm.line_items.length === 0 || !invoiceForm.line_items[0].description) {
      toast.error('Please add at least one line item')
      return
    }

    for (const item of invoiceForm.line_items) {
      const amt = parseFloat(item.amount)
      const qty = parseInt(item.quantity, 10)
      if (!Number.isFinite(amt) || amt < 0) {
        toast.error('Each line item needs a valid amount')
        return
      }
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error('Each line item needs a quantity of at least 1')
        return
      }
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Get parent_id from swimmer
      const selectedSwimmer = swimmers.find(s => s.id === invoiceForm.swimmer_id)
      if (!selectedSwimmer) throw new Error('Swimmer not found')

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          swimmer_id: invoiceForm.swimmer_id,
          parent_id: selectedSwimmer.parent_id,
          status: 'draft',
          total_amount: calculateTotal(),
          due_date: invoiceForm.due_date,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create line items (fee_type is NOT NULL in DB — required for PostgREST insert)
      const lineItemsToInsert = invoiceForm.line_items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description.trim(),
        amount: parseFloat(item.amount),
        quantity: parseInt(item.quantity, 10),
        fee_type: item.fee_type || 'monthly_training',
        payment_period: null,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)

      if (itemsError) throw itemsError

      toast.success('Invoice created successfully')
      setShowCreateModal(false)
      setInvoiceForm({
        swimmer_id: '',
        due_date: '',
        line_items: [{ description: '', amount: '', quantity: 1, fee_type: 'monthly_training' }],
      })
      loadInvoices()
    } catch (error) {
      const msg = invoiceErrorMessage(error)
      console.error('Error creating invoice:', msg, error)
      toast.error(msg || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  async function updateInvoiceStatus(invoiceId, newStatus) {
    const supabase = createClient()

    try {
      const updateData = { status: newStatus }
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)

      if (error) throw error

      toast.success(`Invoice marked as ${newStatus}`)
      loadInvoices()
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Failed to update invoice')
    }
  }

  function viewInvoiceDetails(invoice) {
    setSelectedInvoice(invoice)
    setShowDetailsModal(true)
  }

  function renderPaymentInfo(row) {
    const payment = row.payments?.[0]
    if (!payment) {
      return <span className="text-sm text-gray-500 dark:text-gray-400">No payment</span>
    }
    return (
      <div className="text-sm">
        <div className="font-medium capitalize text-gray-900 dark:text-gray-100">
          {payment.payment_channel || 'Card'}
        </div>
        {payment.paystack_reference && (
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
            {payment.paystack_reference.substring(0, 16)}…
          </div>
        )}
      </div>
    )
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
      render: (row) => (
        <Badge variant={INVOICE_STATUS_VARIANTS[row.status]}>{row.status.toUpperCase()}</Badge>
      ),
    },
    {
      header: 'Payment Info',
      accessor: 'payment_info',
      render: (row) => renderPaymentInfo(row),
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => formatDate(row.due_date),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => viewInvoiceDetails(row)}
          >
            View
          </Button>
          {row.status === 'paid' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => downloadReceipt(row.id)}
            >
              Receipt
            </Button>
          )}
          {row.status !== 'paid' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => updateInvoiceStatus(row.id, 'paid')}
            >
              Mark Paid
            </Button>
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

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Invoice Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                  Generate and track invoices
                </p>
              </div>
              <Button
                fullWidth
                className="md:w-auto md:shrink-0 md:min-w-[12rem]"
                onClick={() => setShowCreateModal(true)}
              >
                Create invoice
              </Button>
            </div>
          </div>

          <Card padding="normal" className="mb-4 md:mb-6">
            <label htmlFor="admin-invoice-search" className="sr-only">
              Search invoices
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                id="admin-invoice-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search swimmer, invoice ID, status, amount, Paystack ref…"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-11 text-base text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 sm:py-2.5 sm:text-sm min-h-[48px] sm:min-h-0"
              />
              {invoiceSearch ? (
                <button
                  type="button"
                  onClick={() => setInvoiceSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
            {invoiceSearch.trim() && invoices.length > 0 ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredInvoices.length} of {invoices.length} invoice
                {invoices.length !== 1 ? 's' : ''}
              </p>
            ) : null}
          </Card>

          <Card padding="none">
            <div className="md:hidden">
              {invoices.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No invoices found
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="px-4 py-12 text-center space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No invoices match your search.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setInvoiceSearch('')}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map((row) => {
                    const payment = row.payments?.[0]
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
                          <Badge variant={INVOICE_STATUS_VARIANTS[row.status]} className="shrink-0">
                            {row.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Amount</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatKES(row.total_amount)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Due</span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {formatDate(row.due_date)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Payment
                            </p>
                            {payment ? (
                              <div className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="capitalize">{payment.payment_channel || 'Card'}</span>
                                {payment.paystack_reference && (
                                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all mt-0.5">
                                    {payment.paystack_reference}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No payment</span>
                            )}
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
                          {row.status !== 'paid' && (
                            <Button
                              fullWidth
                              size="sm"
                              onClick={() => updateInvoiceStatus(row.id, 'paid')}
                            >
                              Mark as paid
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
                data={filteredInvoices}
                emptyMessage={
                  invoices.length === 0
                    ? 'No invoices found'
                    : 'No invoices match your search'
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Invoice"
        size="xl"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              fullWidth
              className="sm:w-auto"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={handleCreateInvoice}
              loading={saving}
            >
              Create invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Swimmer"
              required
              value={invoiceForm.swimmer_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, swimmer_id: e.target.value })}
              options={swimmers.map(s => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`
              }))}
            />
            <Input
              label="Due Date"
              type="date"
              required
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Line Items</h3>
            {invoiceForm.line_items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <Select
                    label="Fee type"
                    value={item.fee_type || 'monthly_training'}
                    onChange={(e) => updateLineItem(index, 'fee_type', e.target.value)}
                    options={LINE_ITEM_FEE_TYPES}
                    placeholder=""
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Input
                    label="Amount"
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <Input
                    label="Qty"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-center gap-2 pb-2">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {formatKES((parseFloat(item.amount) || 0) * (parseInt(item.quantity, 10) || 0))}
                  </span>
                  {invoiceForm.line_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <Button fullWidth className="sm:w-auto" size="sm" variant="secondary" onClick={addLineItem}>
              Add line item
            </Button>
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">
              {formatKES(calculateTotal())}
            </span>
          </div>
        </div>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Invoice Details"
        size="lg"
        footer={
          selectedInvoice && selectedInvoice.status !== 'paid' && (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <Button
                fullWidth
                className="sm:w-auto"
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              {selectedInvoice.status === 'draft' && (
                <Button
                  fullWidth
                  className="sm:w-auto"
                  onClick={() => updateInvoiceStatus(selectedInvoice.id, 'issued')}
                >
                  Issue invoice
                </Button>
              )}
              <Button
                fullWidth
                className="sm:w-auto"
                variant="success"
                onClick={() => updateInvoiceStatus(selectedInvoice.id, 'paid')}
              >
                Mark as paid
              </Button>
            </div>
          )
        }
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Swimmer</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {selectedInvoice.swimmers?.first_name} {selectedInvoice.swimmers?.last_name}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedInvoice.due_date)}</p>
              </div>
              {selectedInvoice.paid_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid At</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedInvoice.paid_at)}</p>
                </div>
              )}
              {selectedInvoice.payments?.[0]?.payment_channel && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Channel</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {selectedInvoice.payments[0].payment_channel}
                  </p>
                </div>
              )}
              {selectedInvoice.payments?.[0]?.paystack_reference && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paystack Reference</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                    {selectedInvoice.payments[0].paystack_reference}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Line Items</h3>
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Description</th>
                    <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Amount</th>
                    <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Qty</th>
                    <th className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.invoice_line_items?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="text-sm text-gray-900 dark:text-gray-100 py-2">{item.description}</td>
                      <td className="text-sm text-gray-900 dark:text-gray-100 py-2 text-right">{formatKES(item.amount)}</td>
                      <td className="text-sm text-gray-900 dark:text-gray-100 py-2 text-right">{item.quantity}</td>
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
                <span className="text-2xl font-bold text-primary">
                  {formatKES(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </>
  )
}
