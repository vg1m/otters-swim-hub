'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  // Memoize the Supabase client to avoid creating a new instance on every render
  const supabase = useMemo(() => createClient(), [])

  // Define getProfile before useEffect to avoid "cannot access before initialization" error
  const getProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }

      if (data) {
        setProfile(data)
        return data
      }
    } catch (err) {
      console.error('getProfile error:', err)
      return null
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [supabase, getProfile])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }, [supabase])

  const signUp = useCallback(async (email, password, fullName, phoneNumber) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
        },
      },
    })

    if (error) throw error

    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          phone_number: phoneNumber,
          role: 'parent',
        })

      if (profileError) throw profileError
    }

    return data
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/')
  }, [supabase, router])

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isCoach: profile?.role === 'coach',
    isParent: profile?.role === 'parent',
  }
}
