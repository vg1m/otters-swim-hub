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
import FamilySharedAccessPanel from '@/components/parent/FamilySharedAccessPanel'
import Link from 'next/link'
import { format } from 'date-fns'
import { fetchParentIdsForDataAccess } from '@/lib/parent/effective-parent-ids'
import toast from 'react-hot-toast'

function ProfileField({ label, value, hint, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-words">{value}</p>
      {hint ? <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p> : null}
    </div>
  )
}

export default function ProfileSettings() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [swimmers, setSwimmers] = useState([])
  const [consents, setConsents] = useState([])
  const [showUpdateConsentModal, setShowUpdateConsentModal] = useState(false)
  const [selectedConsent, setSelectedConsent] = useState(null)
  const [updatingConsent, setUpdatingConsent] = useState(false)

  const [familyInvites, setFamilyInvites] = useState([])
  const [canManageFamilyInvites, setCanManageFamilyInvites] = useState(false)
  
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
        relationship: profile.relationship || 'guardian', // Default to 'guardian' if not set
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
      })
    }
  }, [user, profile, authLoading, router])

  const loadProfileData = async () => {
    try {
      const supabase = createClient()
      const parentIds = await fetchParentIdsForDataAccess(supabase, user.id)

      // Load swimmers (primary account + linked family)
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('*')
        .in('parent_id', parentIds)
        .order('created_at', { ascending: true })

      if (swimmersError) throw swimmersError

      setSwimmers(swimmersData || [])

      const { data: delegateLink } = await supabase
        .from('family_account_members')
        .select('id')
        .eq('member_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      const manageInvites = profile?.role === 'parent' && !delegateLink
      setCanManageFamilyInvites(manageInvites)

      if (manageInvites) {
        const { data: invites, error: invitesError } = await supabase
          .from('family_account_members')
          .select('*')
          .eq('primary_parent_id', user.id)
          .neq('status', 'revoked')
          .order('created_at', { ascending: false })
        if (invitesError) throw invitesError
        setFamilyInvites(invites || [])
      } else {
        setFamilyInvites([])
      }

      // Get swimmer IDs
      const swimmerIds = (swimmersData || []).map(s => s.id)

      // Load consent records - fetch by both parent_id AND swimmer ownership
      // This ensures we get ALL consents, including those created before account linking
      let allConsents = []

      if (swimmerIds.length > 0) {
        // Fetch consents linked to this parent's swimmers
        const { data: swimmerConsents, error: swimmerConsentsError } = await supabase
          .from('registration_consents')
          .select('*, swimmers(first_name, last_name)')
          .in('swimmer_id', swimmerIds)
          .order('consented_at', { ascending: false })

        if (swimmerConsentsError) throw swimmerConsentsError
        allConsents = swimmerConsents || []
      }

      // Deduplicate by consent ID (in case both queries returned same records)
      const uniqueConsents = Array.from(
        new Map(allConsents.map(c => [c.id, c])).values()
      )

      setConsents(uniqueConsents)
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
      relationship: profile?.relationship || 'guardian', // Default to 'guardian' if not set
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
      relationship: profile?.relationship || 'guardian', // Default to 'guardian' if not set
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
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Profile Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage your account information and consents
            </p>
          </div>

          {/* Account details — parent + emergency side by side on large screens */}
          <Card
            title="Account details"
            padding="normal"
            action={
              !isEditing ? (
                <Button variant="secondary" size="sm" onClick={handleEditProfile}>
                  Edit Profile
                </Button>
              ) : null
            }
          >
            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Parent / Guardian
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
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
                      <ProfileField label="Full Name" value={profile?.full_name || 'Not provided'} />
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
                      <ProfileField
                        label="Relationship"
                        value={profile?.relationship || 'Not specified'}
                        className="capitalize"
                      />
                    )}
                  </div>

                  <div>
                    <ProfileField
                      label="Email"
                      value={profile?.email || user?.email}
                      hint="Contact admin to change"
                    />
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
                      <ProfileField label="Phone" value={profile?.phone_number || 'Not provided'} />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-5 md:pt-0 border-t md:border-t-0 border-gray-200 dark:border-gray-700 md:border-l md:pl-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Emergency contact
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
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
                      <ProfileField
                        label="Full Name"
                        value={profile?.emergency_contact_name || 'Not provided'}
                      />
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
                      <ProfileField
                        label="Relationship"
                        value={profile?.emergency_contact_relationship || 'Not specified'}
                        className="capitalize"
                      />
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
                      <ProfileField
                        label="Phone"
                        value={profile?.emergency_contact_phone || 'Not provided'}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button variant="primary" onClick={handleSaveProfile} loading={saving} disabled={saving}>
                  Save Changes
                </Button>
                <Button variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>

          {canManageFamilyInvites && (
            <FamilySharedAccessPanel
              familyInvites={familyInvites}
              onRefresh={loadProfileData}
            />
          )}

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
                      showPolicyText={false}
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

          <Card padding="normal">
            <Link
              href="/privacy"
              className="group flex items-start sm:items-center gap-3 sm:gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-cyan-50/80 p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-md dark:from-primary/10 dark:via-gray-900 dark:to-cyan-950/30 dark:border-primary/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0 pr-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Privacy & your data</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
                  Learn how we protect your data.
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-transform group-hover:translate-x-0.5 self-center">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
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
