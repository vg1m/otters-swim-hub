'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import toast from 'react-hot-toast'

export default function SwimmersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      loadSwimmers()
    }
  }, [user, authLoading, router])

  async function loadSwimmers() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('*')
        .eq('parent_id', user.id)
        .order('first_name', { ascending: true })

      if (error) throw error
      setSwimmers(data || [])
    } catch (error) {
      console.error('Error loading swimmers:', error)
      toast.error('Failed to load swimmers')
    } finally {
      setLoading(false)
    }
  }

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Swimmers</h1>
            <p className="text-gray-600 mt-2">View swimmer profiles and details</p>
          </div>

          {swimmers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You don't have any registered swimmers yet.</p>
                <Link href="/register">
                  <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    Register a Swimmer
                  </button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {swimmers.map((swimmer) => (
                <Card key={swimmer.id} padding="normal">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {swimmer.first_name} {swimmer.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {calculateAge(swimmer.date_of_birth)} years old
                        </p>
                      </div>
                      <Badge variant={
                        swimmer.status === 'approved' ? 'success' :
                        swimmer.status === 'pending' ? 'warning' : 'default'
                      }>
                        {swimmer.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Gender:</span>
                        <span className="capitalize">{swimmer.gender}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Date of Birth:</span>
                        <span>{formatDate(swimmer.date_of_birth)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Squad:</span>
                        <Badge variant="info">
                          {swimmer.squad.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      {swimmer.sub_squad && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Sub Squad:</span>
                          <span className="uppercase">{swimmer.sub_squad}</span>
                        </div>
                      )}
                      {swimmer.license_number && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">License:</span>
                          <span>{swimmer.license_number}</span>
                        </div>
                      )}
                      {swimmer.medical_expiry_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Medical Expiry:</span>
                          <span className={
                            new Date(swimmer.medical_expiry_date) < new Date()
                              ? 'text-red-600 font-semibold'
                              : ''
                          }>
                            {formatDate(swimmer.medical_expiry_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
