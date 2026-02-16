'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export function useSwimmers() {
  const { user } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadSwimmers()
    }
  }, [user])

  async function loadSwimmers() {
    const supabase = createClient()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('*')
        .eq('parent_id', user.id)
        .order('first_name', { ascending: true })

      if (error) throw error
      setSwimmers(data || [])
    } catch (err) {
      console.error('Error loading swimmers:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshSwimmers() {
    await loadSwimmers()
  }

  return {
    swimmers,
    loading,
    error,
    refreshSwimmers,
  }
}
