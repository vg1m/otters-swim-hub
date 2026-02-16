'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
    line_items: [{ description: '', amount: '', quantity: 1 }],
  })

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/login')
        return
      }
      // Load invoices and swimmers in parallel
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
          invoice_line_items (*)
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
      line_items: [...invoiceForm.line_items, { description: '', amount: '', quantity: 1 }]
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

      // Create line items
      const lineItemsToInsert = invoiceForm.line_items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        amount: parseFloat(item.amount),
        quantity: parseInt(item.quantity),
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
        line_items: [{ description: '', amount: '', quantity: 1 }],
      })
      loadInvoices()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Failed to create invoice')
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
      render: (row) => formatDate(row.due_date),
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => viewInvoiceDetails(row)}
          >
            View
          </Button>
          {row.status !== 'paid' && (
            <Button
              size="sm"
              variant="success"
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
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
              <p className="text-gray-600 mt-2">Generate and track invoices</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              + Create Invoice
            </Button>
          </div>

          <Card padding="none">
            <Table columns={columns} data={invoices} emptyMessage="No invoices found" />
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
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} loading={saving}>
              Create Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  placeholder="Description"
                  className="col-span-6"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  className="col-span-2"
                  value={item.amount}
                  onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  className="col-span-2"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                />
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatKES((item.amount || 0) * (item.quantity || 0))}
                  </span>
                  {invoiceForm.line_items.length > 1 && (
                    <button
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addLineItem}>
              + Add Line Item
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
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              {selectedInvoice.status === 'draft' && (
                <Button
                  onClick={() => updateInvoiceStatus(selectedInvoice.id, 'issued')}
                >
                  Issue Invoice
                </Button>
              )}
              <Button
                variant="success"
                onClick={() => updateInvoiceStatus(selectedInvoice.id, 'paid')}
              >
                Mark as Paid
              </Button>
            </div>
          )
        }
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Swimmer</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedInvoice.swimmers?.first_name} {selectedInvoice.swimmers?.last_name}
                </p>
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
          </div>
        )}
      </Modal>

      <Footer />
    </>
  )
}
