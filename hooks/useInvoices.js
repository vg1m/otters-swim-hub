'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export function useInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadInvoices()
    }
  }, [user])

  async function loadInvoices() {
    const supabase = createClient()
    setLoading(true)
    setError(null)

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
    } catch (err) {
      console.error('Error loading invoices:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshInvoices() {
    await loadInvoices()
  }

  function getOutstandingTotal() {
    return invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0)
  }

  function getUnpaidCount() {
    return invoices.filter(inv => inv.status !== 'paid').length
  }

  function getPaidCount() {
    return invoices.filter(inv => inv.status === 'paid').length
  }

  return {
    invoices,
    loading,
    error,
    refreshInvoices,
    outstandingTotal: getOutstandingTotal(),
    unpaidCount: getUnpaidCount(),
    paidCount: getPaidCount(),
  }
}
