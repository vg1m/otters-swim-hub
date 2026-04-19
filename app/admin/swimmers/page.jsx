'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { calculateAge, formatDate } from '@/lib/utils/date-helpers'
import {
  formatSessionsPerWeekLabel,
  formatPreferredPaymentTypeLabel,
} from '@/lib/utils/currency'
import { createSwimmerOnboardingInvoice } from '@/lib/invoices/create-swimmer-onboarding-invoice'
import toast from 'react-hot-toast'

function renderParentChoiceCell(row) {
  return (
    <div className="text-sm text-gray-900 dark:text-gray-100 md:max-w-[12rem]">
      <span>{formatSessionsPerWeekLabel(row.sessions_per_week)}</span>
      {row.preferred_payment_type && (
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {formatPreferredPaymentTypeLabel(row.preferred_payment_type)}
        </span>
      )}
    </div>
  )
}

function renderSquadCell(row) {
  const isUnderSix = row.date_of_birth && calculateAge(row.date_of_birth) < 6
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant={row.squads?.name ? 'info' : 'default'}>
        {row.squads?.name || 'Pending assignment'}
      </Badge>
      {isUnderSix && (
        <Badge variant="success" size="sm">Under 6</Badge>
      )}
    </div>
  )
}

function renderStatusCell(row) {
  const variant = {
    approved: 'success',
    pending: 'warning',
    inactive: 'default',
  }[row.status]
  return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
}

function renderGalaCell(row) {
  return (
    <Badge variant={row.gala_events_opt_in ? 'success' : 'default'} size="sm">
      {row.gala_events_opt_in ? 'Opted In' : 'Not Opted In'}
    </Badge>
  )
}

export default function SwimmersManagementPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [squadFilter, setSquadFilter] = useState('all')
  const [selectedSwimmer, setSelectedSwimmer] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [squadList, setSquadList] = useState([])

  useEffect(() => {
    // Optimistic auth check - use cached profile if available
    const cachedProfile = user ? profileCache.get(user.id) : null
    
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cachedProfile?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    
    // Load data immediately if we have user (even if profile still loading)
    if (user && !swimmers.length) {
      loadSwimmers()
    }
  }, [user, profile, authLoading])

  async function loadSwimmers() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Load swimmers
      const { data, error } = await supabase
        .from('swimmers')
        .select('*, squads(id, name)')
        .order('last_name', { ascending: true })

      if (error) throw error
      setSwimmers(data || [])

      const { data: coachesData } = await supabase
        .from('profiles')
        .select('id, full_name, coach_squad_id, squads(name)')
        .eq('role', 'coach')
        .order('full_name')

      setCoaches(coachesData || [])

      const { data: squadsData } = await supabase
        .from('squads')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order')
        .order('name')

      setSquadList(squadsData || [])
    } catch (error) {
      console.error('Error loading swimmers:', error)
      toast.error('Failed to load swimmers')
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered swimmers to avoid re-computation on every render
  const filteredSwimmers = useMemo(() => {
    let filtered = swimmers

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Squad filter
    if (squadFilter !== 'all') {
      filtered = filtered.filter((s) => s.squad_id === squadFilter)
    }

    return filtered
  }, [swimmers, searchTerm, statusFilter, squadFilter])

  const openEditModal = useCallback((swimmer) => {
    setSelectedSwimmer(swimmer)
    setEditForm({
      first_name: swimmer.first_name,
      last_name: swimmer.last_name,
      date_of_birth: swimmer.date_of_birth,
      gender: swimmer.gender,
      squad_id: swimmer.squad_id || '',
      status: swimmer.status,
      coach_id: swimmer.coach_id || '',
      gala_events_opt_in: swimmer.gala_events_opt_in || false,
    })
    setShowEditModal(true)
  }, [])

  async function handleSaveEdit() {
    if (!selectedSwimmer) return

    if (editForm.status === 'approved') {
      if (!editForm.squad_id) {
        toast.error('Assign a squad before approving')
        return
      }
      if (!editForm.coach_id) {
        toast.error('Assign a coach before approving')
        return
      }
      if (!selectedSwimmer.parent_id) {
        toast.error('Parent account must be linked (same email signup) before approval and invoicing')
        return
      }
    }

    setSaving(true)
    const supabase = createClient()
    const prevStatus = selectedSwimmer.status

    try {
      const cleanedData = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        date_of_birth: editForm.date_of_birth,
        gender: editForm.gender,
        squad_id: editForm.squad_id || null,
        status: editForm.status,
        coach_id: editForm.coach_id || null,
        gala_events_opt_in: editForm.gala_events_opt_in || false,
      }

      const { error } = await supabase
        .from('swimmers')
        .update(cleanedData)
        .eq('id', selectedSwimmer.id)

      if (error) throw error

      if (editForm.status === 'approved' && prevStatus !== 'approved') {
        const inv = await createSwimmerOnboardingInvoice(supabase, {
          swimmerId: selectedSwimmer.id,
          paymentType: 'monthly',
        })
        if (inv.error) {
          toast.error(inv.error)
        } else {
          toast.success('Swimmer approved and invoice created — parent can pay from the dashboard')
        }
      } else {
        toast.success('Swimmer updated successfully')
      }

      setShowEditModal(false)
      loadSwimmers()
    } catch (error) {
      console.error('Error updating swimmer:', error)
      toast.error('Failed to update swimmer')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(swimmer) {
    if (!confirm(`Deactivate ${swimmer.first_name} ${swimmer.last_name}?`)) {
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('swimmers')
        .update({ status: 'inactive' })
        .eq('id', swimmer.id)

      if (error) throw error

      toast.success('Swimmer deactivated')
      loadSwimmers()
    } catch (error) {
      console.error('Error deactivating swimmer:', error)
      toast.error('Failed to deactivate swimmer')
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {row.first_name} {row.last_name}
          </p>
          {row.license_number && (
            <p className="text-xs text-gray-500 dark:text-gray-400">License: {row.license_number}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Age',
      accessor: 'age',
      render: (row) => calculateAge(row.date_of_birth),
    },
    {
      header: 'Parent choice',
      accessor: 'sessions_per_week',
      render: (row) => renderParentChoiceCell(row),
    },
    {
      header: 'Squad',
      accessor: 'squad',
      render: (row) => renderSquadCell(row),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => renderStatusCell(row),
    },
    {
      header: 'Gala Events',
      accessor: 'gala_events_opt_in',
      render: (row) => renderGalaCell(row),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link href={`/swimmers/${row.id}/performance`}>
            <Button size="sm" variant="ghost">
              Progress
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          {row.status === 'approved' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeactivate(row)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ]

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
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Swimmer Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage all registered swimmers
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search by name or license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <Select
                value={squadFilter}
                onChange={(e) => setSquadFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Squads' },
                  ...squadList.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setSquadFilter('all')
                }}
              >
                Clear Filters
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card padding="none">
            {filteredSwimmers.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No swimmers found matching your filters
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSwimmers.map((row) => (
                    <div key={row.id} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-snug">
                            {row.first_name} {row.last_name}
                          </p>
                          {row.license_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              License {row.license_number}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                            {row.gender} · Age {calculateAge(row.date_of_birth)}
                          </p>
                        </div>
                        <div className="shrink-0">{renderStatusCell(row)}</div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Parent choice
                          </p>
                          <div className="mt-1">{renderParentChoiceCell(row)}</div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Squad
                          </p>
                          <div className="mt-1">{renderSquadCell(row)}</div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Gala events
                          </p>
                          <div className="mt-1">{renderGalaCell(row)}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <Button
                          fullWidth
                          variant="secondary"
                          onClick={() => openEditModal(row)}
                        >
                          Edit swimmer
                        </Button>
                        <Link
                          href={`/swimmers/${row.id}/performance`}
                          className="block w-full"
                        >
                          <Button fullWidth variant="outline" className="w-full">
                            View progress
                          </Button>
                        </Link>
                        {row.status === 'approved' && (
                          <Button
                            fullWidth
                            variant="danger"
                            onClick={() => handleDeactivate(row)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={columns}
                    data={filteredSwimmers}
                    emptyMessage="No swimmers found matching your filters"
                  />
                </div>
              </>
            )}
          </Card>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredSwimmers.length} of {swimmers.length} swimmers
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Swimmer Details"
        size="lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSaveEdit}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        {/* Under-6 waiver notice */}
        {editForm.date_of_birth && calculateAge(editForm.date_of_birth) < 6 && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Registration fee waived — swimmer is under 6 years old
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                Squad auto-assigned to Pups. The onboarding invoice will reflect KES 0 for the annual registration line item.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            value={editForm.first_name || ''}
            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
          />
          <Input
            label="Last Name"
            required
            value={editForm.last_name || ''}
            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
          />
          <Input
            label="Date of Birth"
            type="date"
            required
            value={editForm.date_of_birth || ''}
            onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
          />
          <Select
            label="Gender"
            required
            value={editForm.gender || ''}
            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
          <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Parent registration — training frequency
            </p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatSessionsPerWeekLabel(selectedSwimmer?.sessions_per_week)}
            </p>
            {selectedSwimmer?.preferred_payment_type && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Billing: {formatPreferredPaymentTypeLabel(selectedSwimmer.preferred_payment_type)}
              </p>
            )}
            {selectedSwimmer?.preferred_payment_type === 'per_session' && (
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Per-session: invoiced per attended training. No monthly commitment.
              </p>
            )}
          </div>
          <Select
            label="Squad"
            value={editForm.squad_id || ''}
            onChange={(e) => setEditForm({ ...editForm, squad_id: e.target.value })}
            options={[
              { value: '', label: 'Not assigned yet' },
              ...squadList.map((s) => ({ value: s.id, label: s.name })),
            ]}
            helperText="Required before you can set status to Approved"
          />
          <Select
            label="Assigned Coach"
            value={editForm.coach_id || ''}
            onChange={(e) => setEditForm({ ...editForm, coach_id: e.target.value })}
            options={[
              { value: '', label: 'No Coach Assigned' },
              ...coaches.map((c) => {
                const sn = c.squads?.name
                return {
                  value: c.id,
                  label: `${c.full_name}${sn ? ` (${sn})` : ''}`,
                }
              }),
            ]}
            helperText="Manually assign coach based on availability"
          />
          <Select
            label="Status"
            required
            value={editForm.status || ''}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {/* Gala Events Opt-In */}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Do you wish for this swimmer to participate in competitive swimming events?
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {[
              { value: true,  label: 'Yes' },
              { value: false, label: 'No' },
            ].map(({ value, label }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-0">
                <input
                  type="radio"
                  name="editGalaEvents"
                  checked={editForm.gala_events_opt_in === value}
                  onChange={() => setEditForm({ ...editForm, gala_events_opt_in: value })}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Footer />
    </>
  )
}
