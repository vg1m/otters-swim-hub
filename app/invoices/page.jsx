'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ParentInvoicesPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      loadInvoices()
    }
  }, [user, authLoading, router])

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
        .eq('parent_id', user.id)
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
        <button
          className="text-primary hover:text-primary-dark font-medium text-sm"
          onClick={() => viewInvoiceDetails(row)}
        >
          View Details
        </button>
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
            <h1 className="text-3xl font-bold text-gray-900">My Invoices</h1>
            <p className="text-gray-600 mt-2">View and manage your payment invoices</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card padding="normal">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
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
