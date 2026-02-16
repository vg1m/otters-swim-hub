'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recentCheckIns, setRecentCheckIns] = useState([])
  const videoRef = useRef(null)
  const streamRef = useRef(null)

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

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

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

  async function startScanning() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setScanning(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('Could not access camera. Please use manual code entry.')
    }
  }

  function stopScanning() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  async function handleManualCheckIn() {
    if (!selectedSwimmer) {
      toast.error('Please select a swimmer')
      return
    }

    if (!manualCode.trim()) {
      toast.error('Please enter session code')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Parse QR data (it should be JSON from the QR code)
      let sessionData
      try {
        sessionData = JSON.parse(manualCode)
      } catch {
        // If not JSON, treat as session token
        sessionData = { token: manualCode.trim() }
      }

      // Find session by token
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('qr_code_token', sessionData.token)
        .single()

      if (sessionError || !session) {
        toast.error('Invalid session code')
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
        toast.error('Already checked in to this session')
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

      toast.success('Check-in successful!')
      setManualCode('')
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
            <h1 className="text-3xl font-bold text-gray-900">Session Check-In</h1>
            <p className="text-gray-600 mt-2">Scan QR code or enter session code manually</p>
          </div>

          {swimmers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You don't have any approved swimmers yet.</p>
                <p className="text-sm text-gray-500">Please wait for admin approval or contact the club.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Check-In Form */}
              <Card className="mb-8">
                <div className="space-y-6">
                  <Select
                    label="Select Swimmer"
                    required
                    value={selectedSwimmer}
                    onChange={(e) => setSelectedSwimmer(e.target.value)}
                    options={swimmers.map(s => ({
                      value: s.id,
                      label: `${s.first_name} ${s.last_name}`
                    }))}
                  />

                  {/* QR Scanner (placeholder - requires proper QR library) */}
                  {!scanning && (
                    <div>
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={startScanning}
                      >
                        📷 Scan QR Code
                      </Button>
                    </div>
                  )}

                  {scanning && (
                    <div>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg border-2 border-gray-300"
                      />
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={stopScanning}
                        className="mt-2"
                      >
                        Stop Scanning
                      </Button>
                      <p className="text-sm text-gray-600 text-center mt-2">
                        Position the QR code within the camera frame
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter session code or paste QR data"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleManualCheckIn()
                        }
                      }}
                      fullWidth
                    />
                    <Button
                      onClick={handleManualCheckIn}
                      loading={loading}
                      disabled={!selectedSwimmer || !manualCode}
                    >
                      Check In
                    </Button>
                  </div>
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

              {/* Instructions */}
              <Card title="How to Check In" className="mt-6">
                <div className="space-y-2 text-sm text-gray-700">
                  <p>✓ Select the swimmer who is checking in</p>
                  <p>✓ Scan the QR code displayed at the pool using your camera</p>
                  <p>✓ Or manually enter the session code provided by your coach</p>
                  <p>✓ Confirmation will appear once check-in is successful</p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
