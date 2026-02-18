'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function CheckInPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [selectedSwimmer, setSelectedSwimmer] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [recentCheckIns, setRecentCheckIns] = useState([])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      loadSwimmers()
      loadRecentCheckIns()
    }
  }, [user, authLoading, router])


  async function loadSwimmers() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('id, first_name, last_name, squad')
        .eq('parent_id', user.id)
        .eq('status', 'approved')

      if (error) throw error
      setSwimmers(data || [])
      
      if (data && data.length === 1) {
        setSelectedSwimmer(data[0].id)
      }
    } catch (error) {
      console.error('Error loading swimmers:', error)
    }
  }

  async function loadRecentCheckIns() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          swimmers (first_name, last_name),
          training_sessions (session_date, start_time, pool_location)
        `)
        .in('swimmer_id', swimmers.map(s => s.id))
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentCheckIns(data || [])
    } catch (error) {
      console.error('Error loading check-ins:', error)
    }
  }

  async function handleCheckIn() {
    if (!selectedSwimmer) {
      toast.error('Please select a swimmer')
      return
    }

    if (!sessionCode.trim()) {
      toast.error('Please enter the session code')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const codeToCheck = sessionCode.trim().toUpperCase()

      // Find session by token
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('qr_code_token', codeToCheck)
        .single()

      if (sessionError || !session) {
        toast.error('Invalid session code. Please check the code and try again.')
        return
      }

      // Check if already checked in
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', session.id)
        .eq('swimmer_id', selectedSwimmer)
        .single()

      if (existing) {
        toast.error('This swimmer is already checked in to this session')
        return
      }

      // Create attendance record
      const { error: checkInError } = await supabase
        .from('attendance')
        .insert({
          session_id: session.id,
          swimmer_id: selectedSwimmer,
          checked_in_by: 'self',
          check_in_time: new Date().toISOString(),
        })

      if (checkInError) throw checkInError

      // Get swimmer name for success message
      const swimmer = swimmers.find(s => s.id === selectedSwimmer)
      toast.success(`✅ ${swimmer.first_name} checked in successfully!`)
      setSessionCode('')
      loadRecentCheckIns()
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error('Check-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Session Check-In</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Scan QR code or enter session code manually</p>
          </div>

          {swimmers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any approved swimmers yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please wait for admin approval or contact the club.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Check-In Form */}
              <Card className="mb-8">
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">How to Check In</h3>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>1. Select which swimmer is present</li>
                          <li>2. Get the session code from your coach or poolside sign</li>
                          <li>3. Enter the code and tap "Check In"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Select
                    label="Which swimmer is checking in?"
                    required
                    value={selectedSwimmer}
                    onChange={(e) => setSelectedSwimmer(e.target.value)}
                    options={swimmers.map(s => ({
                      value: s.id,
                      label: `${s.first_name} ${s.last_name}`
                    }))}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Code *
                    </label>
                    <input
                      type="text"
                      value={sessionCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                        if (value.length <= 6) {
                          setSessionCode(value)
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCheckIn()
                        }
                      }}
                      placeholder="K4M8N2"
                      maxLength={6}
                      className="w-full text-center text-3xl font-bold font-mono tracking-widest uppercase px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Enter the 6-character code from poolside display
                    </p>
                    {sessionCode.length > 0 && (
                      <p className="text-xs text-center mt-1 text-gray-400">
                        {sessionCode.length}/6 characters
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleCheckIn}
                    loading={loading}
                    disabled={!selectedSwimmer || !sessionCode}
                    fullWidth
                    size="lg"
                  >
                    Check In
                  </Button>
                </div>
              </Card>

              {/* Recent Check-Ins */}
              {recentCheckIns.length > 0 && (
                <Card title="Recent Check-Ins">
                  <div className="space-y-3">
                    {recentCheckIns.map((checkIn) => (
                      <div
                        key={checkIn.id}
                        className="flex items-center justify-between p-3 bg-accent rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {checkIn.swimmers?.first_name} {checkIn.swimmers?.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(checkIn.training_sessions?.session_date)} - {checkIn.training_sessions?.start_time}
                          </p>
                          <p className="text-xs text-gray-500">
                            {checkIn.training_sessions?.pool_location}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
