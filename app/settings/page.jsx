'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConsentPolicy from '@/components/ConsentPolicy'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ProfileSettings() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [swimmers, setSwimmers] = useState([])
  const [consents, setConsents] = useState([])
  const [showUpdateConsentModal, setShowUpdateConsentModal] = useState(false)
  const [selectedConsent, setSelectedConsent] = useState(null)
  const [updatingConsent, setUpdatingConsent] = useState(false)
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    phone_number: '',
    relationship: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
  })

  const relationshipOptions = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'guardian', label: 'Legal Guardian' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && profile) {
      loadProfileData()
      // Initialize editable fields
      setEditedProfile({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        relationship: profile.relationship || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
      })
    }
  }, [user, profile, authLoading, router])

  const loadProfileData = async () => {
    try {
      const supabase = createClient()

      // Load swimmers
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true })

      if (swimmersError) throw swimmersError

      setSwimmers(swimmersData || [])

      // Load consent records
      const { data: consentsData, error: consentsError } = await supabase
        .from('registration_consents')
        .select('*, swimmers(first_name, last_name)')
        .eq('parent_id', user.id)
        .order('consented_at', { ascending: false })

      if (consentsError) throw consentsError

      setConsents(consentsData || [])
    } catch (error) {
      console.error('Error loading profile data:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMediaConsent = async (consentId, newMediaConsent) => {
    setUpdatingConsent(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('registration_consents')
        .update({ 
          media_consent: newMediaConsent,
          consented_at: new Date().toISOString() // Update timestamp
        })
        .eq('id', consentId)

      if (error) throw error

      toast.success('Media consent updated successfully')
      setShowUpdateConsentModal(false)
      
      // Note: No need to invalidate profile cache here as consent data is separate
      loadProfileData() // Reload to show updated data
    } catch (error) {
      console.error('Error updating consent:', error)
      toast.error('Failed to update consent')
    } finally {
      setUpdatingConsent(false)
    }
  }

  const handleEditProfile = () => {
    setIsEditing(true)
    // Reset to current profile values
    setEditedProfile({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      relationship: profile?.relationship || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_relationship: profile?.emergency_contact_relationship || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
    })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset to original values
    setEditedProfile({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      relationship: profile?.relationship || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_relationship: profile?.emergency_contact_relationship || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
    })
  }

  const validateProfileUpdate = () => {
    // Validate full name
    if (!editedProfile.full_name || editedProfile.full_name.trim().length < 2) {
      toast.error('Please enter a valid full name')
      return false
    }

    // Validate phone number
    const phoneRegex = /^(\+254|254|0)[17]\d{8}$/
    if (!editedProfile.phone_number) {
      toast.error('Please enter your phone number')
      return false
    }
    if (!phoneRegex.test(editedProfile.phone_number)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)')
      return false
    }

    // Validate relationship
    if (!editedProfile.relationship) {
      toast.error('Please select your relationship to the swimmer')
      return false
    }

    // Validate emergency contact name
    if (!editedProfile.emergency_contact_name || editedProfile.emergency_contact_name.trim().length < 2) {
      toast.error('Please enter a valid emergency contact name')
      return false
    }

    // Validate emergency contact relationship
    if (!editedProfile.emergency_contact_relationship) {
      toast.error('Please select emergency contact relationship')
      return false
    }

    // Validate emergency contact phone
    if (!editedProfile.emergency_contact_phone) {
      toast.error('Please enter emergency contact phone number')
      return false
    }
    if (!phoneRegex.test(editedProfile.emergency_contact_phone)) {
      toast.error('Please enter a valid emergency contact phone number (e.g., 0712345678)')
      return false
    }

    return true
  }

  const handleSaveProfile = async () => {
    console.log('=== SAVE PROFILE STARTED ===')
    console.log('Current profile state:', editedProfile)
    
    if (!validateProfileUpdate()) {
      console.log('Validation failed, aborting save')
      return
    }

    console.log('Validation passed, proceeding with save')
    setSaving(true)
    
    try {
      const supabase = createClient()

      console.log('Attempting to save profile for user:', user.id)
      console.log('Data to save:', {
        full_name: editedProfile.full_name,
        phone_number: editedProfile.phone_number,
        relationship: editedProfile.relationship,
        emergency_contact_name: editedProfile.emergency_contact_name,
        emergency_contact_relationship: editedProfile.emergency_contact_relationship,
        emergency_contact_phone: editedProfile.emergency_contact_phone,
      })

      console.log('Calling Supabase update...')
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: editedProfile.full_name,
          phone_number: editedProfile.phone_number,
          relationship: editedProfile.relationship,
          emergency_contact_name: editedProfile.emergency_contact_name,
          emergency_contact_relationship: editedProfile.emergency_contact_relationship,
          emergency_contact_phone: editedProfile.emergency_contact_phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('❌ Supabase error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('✅ Profile updated successfully!')
      console.log('Response data:', data)
      
      // CRITICAL: Invalidate the profile cache so fresh data is loaded after reload
      console.log('Invalidating profile cache for user:', user.id)
      profileCache.invalidate(user.id)
      console.log('Cache invalidated successfully')
      
      toast.success('Profile updated successfully! Page will reload in 2 seconds...')
      setIsEditing(false)
      
      console.log('Setting timeout for reload...')
      // Reload profile data to show updated values (with delay to see messages)
      setTimeout(() => {
        console.log('Reloading page now...')
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('❌ Error updating profile:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      toast.error(`Failed to update profile: ${error.message}`)
    } finally {
      setSaving(false)
      console.log('=== SAVE PROFILE COMPLETED ===')
    }
  }

  const updateEditedField = (field, value) => {
    console.log(`Field "${field}" changed to:`, value)
    setEditedProfile({ ...editedProfile, [field]: value })
  }

  const handleKeyDown = (e) => {
    // Prevent Enter key from submitting/refreshing
    if (e.key === 'Enter') {
      e.preventDefault()
      console.log('Enter key pressed - prevented default behavior')
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    console.log('Form submit prevented')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your account information and consents
            </p>
          </div>

          {/* Parent/Guardian Information */}
          <Card 
            title="Parent / Guardian Information" 
            padding="normal"
            action={
              !isEditing ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEditProfile}
                >
                  Edit Profile
                </Button>
              ) : null
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {isEditing ? (
                  <Input
                    label="Full Name"
                    required
                    value={editedProfile.full_name}
                    onChange={(e) => updateEditedField('full_name', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="John Doe"
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{profile?.full_name || 'Not provided'}</p>
                  </>
                )}
              </div>
              
              <div>
                {isEditing ? (
                  <Select
                    label="Relationship"
                    required
                    value={editedProfile.relationship}
                    onChange={(e) => updateEditedField('relationship', e.target.value)}
                    options={relationshipOptions}
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Relationship</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100 capitalize">
                      {profile?.relationship || 'Not specified'}
                    </p>
                  </>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{profile?.email || user?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contact admin to change</p>
              </div>
              
              <div>
                {isEditing ? (
                  <Input
                    label="Phone Number"
                    type="tel"
                    required
                    value={editedProfile.phone_number}
                    onChange={(e) => updateEditedField('phone_number', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0712345678"
                    helperText="Kenyan format: 0712345678"
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{profile?.phone_number || 'Not provided'}</p>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Emergency Contact Information */}
          <Card title="Emergency Contact" padding="normal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {isEditing ? (
                  <Input
                    label="Full Name"
                    required
                    value={editedProfile.emergency_contact_name}
                    onChange={(e) => updateEditedField('emergency_contact_name', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Jane Doe"
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {profile?.emergency_contact_name || 'Not provided'}
                    </p>
                  </>
                )}
              </div>
              
              <div>
                {isEditing ? (
                  <Select
                    label="Relationship"
                    required
                    value={editedProfile.emergency_contact_relationship}
                    onChange={(e) => updateEditedField('emergency_contact_relationship', e.target.value)}
                    options={relationshipOptions}
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Relationship</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100 capitalize">
                      {profile?.emergency_contact_relationship || 'Not specified'}
                    </p>
                  </>
                )}
              </div>
              
              <div>
                {isEditing ? (
                  <Input
                    label="Phone Number"
                    type="tel"
                    required
                    value={editedProfile.emergency_contact_phone}
                    onChange={(e) => updateEditedField('emergency_contact_phone', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0712345678"
                    helperText="Kenyan format: 0712345678"
                  />
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {profile?.emergency_contact_phone || 'Not provided'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="primary"
                  onClick={handleSaveProfile}
                  loading={saving}
                  disabled={saving}
                >
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </Card>

          {/* Registered Swimmers */}
          <Card title="Registered Swimmers" padding="normal">
            {swimmers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No registered swimmers yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/register')}
                  className="mt-4"
                >
                  Register a Swimmer
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {swimmers.map((swimmer) => (
                  <div
                    key={swimmer.id}
                    className="flex items-center justify-between p-4 bg-stone-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {swimmer.first_name} {swimmer.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {swimmer.squad?.replace('_', ' ')} Squad · {swimmer.gender}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        swimmer.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : swimmer.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {swimmer.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Consent History */}
          <Card title="Consent History" padding="normal" subtitle="Your consents as per Kenya Data Protection Act">
            {consents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No consent records found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {consents.map((consent) => (
                  <div
                    key={consent.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {consent.swimmers?.first_name} {consent.swimmers?.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Consented on {format(new Date(consent.consented_at), 'PPP')} at{' '}
                          {format(new Date(consent.consented_at), 'p')}
                        </p>
                      </div>
                    </div>

                    {/* Consent Status Display */}
                    <ConsentPolicy
                      consents={{
                        dataAccuracy: consent.data_accuracy_confirmed,
                        codeOfConduct: consent.code_of_conduct_consent,
                        mediaConsent: consent.media_consent,
                      }}
                      showCheckboxes={false}
                      readOnly={true}
                    />

                    {/* Update Media Consent Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedConsent(consent)
                          setShowUpdateConsentModal(true)
                        }}
                      >
                        Update Media Consent
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Contact Admin Notice */}
          <Card padding="normal">
            <div className="flex gap-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Need help with other changes?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Please contact the club administrator for assistance with:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mb-3 list-disc list-inside space-y-1">
                  <li>Email address changes (tied to authentication)</li>
                  <li>Swimmer details or status updates</li>
                  <li>Payment or invoice inquiries</li>
                  <li>Account access issues</li>
                </ul>
                <a
                  href="mailto:admin@otterskenya.com"
                  className="text-primary hover:text-primary-dark font-medium text-sm"
                >
                  Contact Admin →
                </a>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Update Media Consent Modal */}
      {showUpdateConsentModal && selectedConsent && (
        <Modal
          isOpen={showUpdateConsentModal}
          onClose={() => setShowUpdateConsentModal(false)}
          title="Update Media Consent"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Update your media consent for{' '}
              <span className="font-semibold">
                {selectedConsent.swimmers?.first_name} {selectedConsent.swimmers?.last_name}
              </span>
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Media Consent:</strong> Permission to use photographs or videos taken during training or
                competitions for club-related promotional materials, social media, or reports.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current status:{' '}
                <span
                  className={
                    selectedConsent.media_consent
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {selectedConsent.media_consent ? 'Granted' : 'Not Granted'}
                </span>
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant={selectedConsent.media_consent ? 'secondary' : 'primary'}
                onClick={() => handleUpdateMediaConsent(selectedConsent.id, true)}
                loading={updatingConsent}
                disabled={updatingConsent}
                fullWidth
              >
                Grant Consent
              </Button>
              <Button
                variant={!selectedConsent.media_consent ? 'secondary' : 'danger'}
                onClick={() => handleUpdateMediaConsent(selectedConsent.id, false)}
                loading={updatingConsent}
                disabled={updatingConsent}
                fullWidth
              >
                Revoke Consent
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
