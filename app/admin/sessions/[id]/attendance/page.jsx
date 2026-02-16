'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function SessionAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id
  const { user, profile, loading: authLoading } = useAuth()
  const [session, setSession] = useState(null)
  const [swimmers, setSwimmers] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    const userRole = profile?.role || cachedProfile?.role
    
    if (!authLoading) {
      if (!user || (userRole !== 'admin' && userRole !== 'coach')) {
        router.push('/login')
        return
      }
    }
    
    // Load data immediately if we have user and sessionId
    if (user && sessionId && !session) {
      loadSessionData()
    }
  }, [user, profile, authLoading, sessionId])

  async function loadSessionData() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Load swimmers for this squad
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('id, first_name, last_name')
        .eq('squad', sessionData.squad)
        .eq('status', 'approved')
        .order('last_name', { ascending: true })

      if (swimmersError) throw swimmersError
      setSwimmers(swimmersData || [])

      // Load existing attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)

      if (attendanceError) throw attendanceError

      const attendanceMap = {}
      attendanceData.forEach(att => {
        attendanceMap[att.swimmer_id] = {
          id: att.id,
          checked_in_by: att.checked_in_by,
          check_in_time: att.check_in_time,
        }
      })
      setAttendance(attendanceMap)

    } catch (error) {
      console.error('Error loading session data:', error)
      toast.error('Failed to load session data')
    } finally {
      setLoading(false)
    }
  }

  function toggleAttendance(swimmerId) {
    setAttendance(prev => ({
      ...prev,
      [swimmerId]: prev[swimmerId] ? null : { checked_in_by: 'coach', new: true }
    }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    try {
      // Prepare inserts and deletes
      const toInsert = []
      const toDelete = []

      Object.entries(attendance).forEach(([swimmerId, att]) => {
        if (!att) {
          // Was checked in, now unchecked - delete
          const existing = swimmers.find(s => s.id === swimmerId)
          if (existing) {
            // Find the attendance id to delete
            const { data } = supabase
              .from('attendance')
              .select('id')
              .eq('session_id', sessionId)
              .eq('swimmer_id', swimmerId)
            toDelete.push(swimmerId)
          }
        } else if (att.new) {
          // New check-in
          toInsert.push({
            session_id: sessionId,
            swimmer_id: swimmerId,
            checked_in_by: 'coach',
            coach_id: user.id,
            check_in_time: new Date().toISOString(),
          })
        }
      })

      // Delete unchecked
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('attendance')
          .delete()
          .eq('session_id', sessionId)
          .in('swimmer_id', toDelete)

        if (deleteError) throw deleteError
      }

      // Insert new
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(toInsert)

        if (insertError) throw insertError
      }

      toast.success('Attendance saved successfully')
      loadSessionData()
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Session not found</p>
      </div>
    )
  }

  const checkedInCount = Object.values(attendance).filter(Boolean).length

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Session Attendance</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {formatDate(session.session_date)} - {session.start_time} to {session.end_time}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              {session.squad.replace('_', ' ').toUpperCase()} - {session.pool_location}
            </p>
          </div>

          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Attendance</p>
                <p className="text-3xl font-bold text-primary">
                  {checkedInCount} / {swimmers.length}
                </p>
              </div>
              <Button onClick={handleSave} loading={saving}>
                Save Attendance
              </Button>
            </div>
          </Card>

          <Card title="Swimmers">
            <div className="space-y-2">
              {swimmers.map((swimmer) => {
                const isCheckedIn = !!attendance[swimmer.id]
                const checkedInBy = attendance[swimmer.id]?.checked_in_by

                return (
                  <div
                    key={swimmer.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                      isCheckedIn
                        ? 'border-secondary bg-green-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isCheckedIn}
                        onChange={() => toggleAttendance(swimmer.id)}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {swimmer.first_name} {swimmer.last_name}
                        </p>
                        {isCheckedIn && checkedInBy && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Checked in by: {checkedInBy === 'self' ? 'Self' : 'Coach'}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCheckedIn && (
                      <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}
