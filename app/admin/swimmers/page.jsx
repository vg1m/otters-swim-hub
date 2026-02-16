'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
import toast from 'react-hot-toast'

export default function SwimmersManagementPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [swimmers, setSwimmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [squadFilter, setSquadFilter] = useState('all')
  const [selectedSwimmer, setSelectedSwimmer] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/login')
        return
      }
      loadSwimmers()
    }
  }, [user, profile, authLoading])

  async function loadSwimmers() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('*')
        .order('last_name', { ascending: true })

      if (error) throw error
      setSwimmers(data || [])
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
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
        s.license_number?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Squad filter
    if (squadFilter !== 'all') {
      filtered = filtered.filter(s => s.squad === squadFilter)
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
      squad: swimmer.squad,
      sub_squad: swimmer.sub_squad || '',
      license_number: swimmer.license_number || '',
      medical_expiry_date: swimmer.medical_expiry_date || '',
      status: swimmer.status,
    })
    setShowEditModal(true)
  }, [])

  async function handleSaveEdit() {
    if (!selectedSwimmer) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('swimmers')
        .update(editForm)
        .eq('id', selectedSwimmer.id)

      if (error) throw error

      toast.success('Swimmer updated successfully')
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
          <p className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          {row.license_number && (
            <p className="text-xs text-gray-500">License: {row.license_number}</p>
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
      header: 'Squad',
      accessor: 'squad',
      render: (row) => (
        <div>
          <Badge variant="info">
            {row.squad.replace('_', ' ').toUpperCase()}
          </Badge>
          {row.sub_squad && (
            <p className="text-xs text-gray-500 mt-1 uppercase">{row.sub_squad}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const variant = {
          approved: 'success',
          pending: 'warning',
          inactive: 'default',
        }[row.status]
        return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
      },
    },
    {
      header: 'Medical Expiry',
      accessor: 'medical_expiry_date',
      render: (row) => {
        if (!row.medical_expiry_date) return <span className="text-gray-400">-</span>
        const expiry = new Date(row.medical_expiry_date)
        const isExpired = expiry < new Date()
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-700'}>
            {formatDate(row.medical_expiry_date)}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
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
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Swimmer Management</h1>
            <p className="text-gray-600 mt-2">
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
                  { value: 'competitive', label: 'Competitive' },
                  { value: 'learn_to_swim', label: 'Learn to Swim' },
                  { value: 'fitness', label: 'Fitness' },
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
            <Table
              columns={columns}
              data={filteredSwimmers}
              emptyMessage="No swimmers found matching your filters"
            />
          </Card>

          <div className="mt-4 text-sm text-gray-600">
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
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
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
          <Select
            label="Squad"
            required
            value={editForm.squad || ''}
            onChange={(e) => setEditForm({ ...editForm, squad: e.target.value })}
            options={[
              { value: 'competitive', label: 'Competitive' },
              { value: 'learn_to_swim', label: 'Learn to Swim' },
              { value: 'fitness', label: 'Fitness' },
            ]}
          />
          <Select
            label="Sub Squad"
            value={editForm.sub_squad || ''}
            onChange={(e) => setEditForm({ ...editForm, sub_squad: e.target.value })}
            options={[
              { value: '', label: 'None' },
              { value: 'elite', label: 'Elite' },
              { value: 'dev1', label: 'Dev 1' },
              { value: 'dev2', label: 'Dev 2' },
              { value: 'dev3', label: 'Dev 3' },
            ]}
          />
          <Input
            label="License Number"
            value={editForm.license_number || ''}
            onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
          />
          <Input
            label="Medical Expiry Date"
            type="date"
            value={editForm.medical_expiry_date || ''}
            onChange={(e) => setEditForm({ ...editForm, medical_expiry_date: e.target.value })}
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
      </Modal>

      <Footer />
    </>
  )
}
