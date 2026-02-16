'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { profileCache } from '@/lib/cache/profile-cache'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const lastFetchRef = useRef(0)
  const debounceTimerRef = useRef(null)
  
  // Memoize the Supabase client to avoid creating a new instance on every render
  const supabase = useMemo(() => createClient(), [])

  // Optimized getProfile with caching and request deduplication
  const getProfile = useCallback(async (userId, forceRefresh = false) => {
    try {
      // Use cache if available and not forcing refresh
      if (!forceRefresh) {
        const cached = profileCache.get(userId)
        if (cached) {
          setProfile(cached)
          return cached
        }
      }

      // Fetch from database with request deduplication
      const profile = await profileCache.getOrFetch(userId, async (uid) => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single()

        if (error) {
          console.error('Profile fetch error:', error)
          return null
        }

        return data
      })

      if (profile) {
        setProfile(profile)
        return profile
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
          // Try to load from cache first for instant display
          const cached = profileCache.get(session.user.id)
          if (cached) {
            setProfile(cached)
            setLoading(false)
            // Optionally refresh in background
            getProfile(session.user.id, true)
          } else {
            await getProfile(session.user.id)
            setLoading(false)
          }
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        // Clear debounce timer if exists
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        // Debounce auth state changes to prevent rapid-fire fetches
        debounceTimerRef.current = setTimeout(async () => {
          const now = Date.now()
          
          // Prevent fetching more than once per 2 seconds
          if (now - lastFetchRef.current < 2000 && event !== 'SIGNED_IN') {
            return
          }
          
          lastFetchRef.current = now
          
          if (session?.user) {
            setUser(session.user)
            
            // For sign-in events, force refresh profile
            const forceRefresh = event === 'SIGNED_IN' || event === 'USER_UPDATED'
            await getProfile(session.user.id, forceRefresh)
          } else {
            setUser(null)
            setProfile(null)
            profileCache.clearAll()
          }
          setLoading(false)
        }, 100) // 100ms debounce
      }
    )

    return () => {
      mounted = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
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
    
    // Clear all caches on sign out
    profileCache.clearAll()
    setUser(null)
    setProfile(null)
    
    router.push('/')
  }, [supabase, router])

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    getProfile, // Expose for manual refresh if needed
    isAdmin: profile?.role === 'admin',
    isCoach: profile?.role === 'coach',
    isParent: profile?.role === 'parent',
  }
}
