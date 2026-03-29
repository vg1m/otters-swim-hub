'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function CoachManagementPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [coaches, setCoaches] = useState([])
  const [swimmers, setSwimmers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [squadList, setSquadList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEditCoachModal, setShowEditCoachModal] = useState(false)
  const [showViewAssignmentsModal, setShowViewAssignmentsModal] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [assignmentType, setAssignmentType] = useState('squad')
  const [assignForm, setAssignForm] = useState({
    coach_id: '',
    squad_id: '',
    swimmer_id: '',
    notes: '',
  })
  const [editCoachForm, setEditCoachForm] = useState({
    full_name: '',
    email: '',
    coach_squad_id: '',
    per_session_rate_kes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cachedProfile = user ? profileCache.get(user.id) : null
    
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cachedProfile?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    
    if (user) {
      loadAllData()
    }
  }, [user, profile, authLoading])

  async function loadAllData() {
    setLoading(true)
    const supabase = createClient()

    try {
      const [coachesRes, swimmersRes, assignmentsRes, squadsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, squads(id, name)')
          .eq('role', 'coach')
          .order('full_name'),
        supabase
          .from('swimmers')
          .select('id, first_name, last_name, squad_id, squads(name), status, coach_id')
          .order('last_name'),
        supabase
          .from('coach_assignments')
          .select('*, profiles(full_name), swimmers(first_name, last_name), squads(id, name)')
          .order('assigned_at', { ascending: false }),
        supabase
          .from('squads')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      if (coachesRes.error) {
        console.error('Error loading coaches:', coachesRes.error)
        toast.error('Failed to load coaches. Check console for details.')
      }
      if (swimmersRes.error) {
        console.error('Error loading swimmers:', swimmersRes.error)
      }
      if (assignmentsRes.error) {
        console.error('Error loading assignments:', assignmentsRes.error)
      }

      setCoaches(coachesRes.data || [])
      setSwimmers(swimmersRes.data || [])
      setAssignments(assignmentsRes.data || [])
      setSquadList(squadsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load coach data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAssignment() {
    if (!assignForm.coach_id) {
      toast.error('Please select a coach')
      return
    }

    if (assignmentType === 'squad' && !assignForm.squad_id) {
      toast.error('Please select a squad')
      return
    }

    if (assignmentType === 'swimmer' && !assignForm.swimmer_id) {
      toast.error('Please select a swimmer')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('coach_assignments')
        .insert({
          coach_id: assignForm.coach_id,
          squad_id: assignmentType === 'squad' ? assignForm.squad_id : null,
          swimmer_id: assignmentType === 'swimmer' ? assignForm.swimmer_id : null,
          notes: assignForm.notes || null,
        })
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Insert succeeded but no data returned. Possible RLS policy issue.')
      }

      toast.success('Coach assignment created successfully')
      setShowAssignModal(false)
      setSelectedCoach(null)
      
      // Reload data after successful creation
      await loadAllData()
    } catch (error) {
      // Handle duplicate constraint (expected user error, not a bug)
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
        toast.error('This assignment already exists. Coach is already assigned to this squad or swimmer.')
        return
      }
      
      // Log unexpected errors only
      console.error('Error creating assignment:', error)
      
      // Handle other errors
      if (error?.message) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to create assignment. Check console for details.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAssignment(assignment) {
    const target = assignment.squad_id 
      ? `squad: ${assignment.squads?.name || assignment.squad_id}`
      : `swimmer: ${assignment.swimmers?.first_name} ${assignment.swimmers?.last_name}`
    
    if (!confirm(`Remove assignment for ${target}?`)) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('coach_assignments')
        .delete()
        .eq('id', assignment.id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }
      
      toast.success('Assignment removed')
      
      // Reload data after successful deletion
      await loadAllData()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      if (error?.message) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to remove assignment')
      }
    }
  }

  function openEditCoachModal(coach) {
    setSelectedCoach(coach)
    setEditCoachForm({
      full_name: coach.full_name || '',
      email: coach.email || '',
      coach_squad_id: coach.coach_squad_id || '',
      per_session_rate_kes:
        coach.per_session_rate_kes != null && coach.per_session_rate_kes !== ''
          ? String(coach.per_session_rate_kes)
          : '',
    })
    setShowEditCoachModal(true)
  }

  async function handleSaveEditCoach() {
    if (!selectedCoach) return

    if (!editCoachForm.full_name || !editCoachForm.email) {
      toast.error('Name and email are required')
      return
    }

    let perSessionRateKes = null
    const rateRaw = editCoachForm.per_session_rate_kes?.trim() ?? ''
    if (rateRaw !== '') {
      const n = parseFloat(rateRaw)
      if (Number.isNaN(n) || n < 0) {
        toast.error('Per session rate must be a number ≥ 0 or empty')
        return
      }
      perSessionRateKes = n
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editCoachForm.full_name,
          email: editCoachForm.email,
          coach_squad_id: editCoachForm.coach_squad_id || null,
          per_session_rate_kes: perSessionRateKes,
        })
        .eq('id', selectedCoach.id)

      if (error) {
        console.error(
          'Update error:',
          error?.message,
          error?.code,
          error?.details,
          error?.hint,
          error
        )
        throw error
      }

      toast.success('Coach details updated successfully')
      setShowEditCoachModal(false)
      setSelectedCoach(null)
      
      // Reload data after successful update
      await loadAllData()
    } catch (error) {
      console.error('Error updating coach:', error?.message, error?.code, error)
      const msg =
        error?.message ||
        error?.details ||
        (typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error))
      toast.error(msg ? `Failed: ${msg}` : 'Failed to update coach details')
    } finally {
      setSaving(false)
    }
  }

  function openViewAssignmentsModal(coach) {
    setSelectedCoach(coach)
    setShowViewAssignmentsModal(true)
  }

  async function handleRemoveCoach(coach) {
    const coachAssignments = assignments.filter(a => a.coach_id === coach.id)
    const directSwimmers = swimmers.filter(s => s.coach_id === coach.id)
    
    const assignmentCount = coachAssignments.length
    const swimmerCount = directSwimmers.length

    if (assignmentCount > 0 || swimmerCount > 0) {
      const message = `This coach has ${assignmentCount} assignment(s) and ${swimmerCount} directly assigned swimmer(s).\n\nRemoving this coach will:\n- Remove all coach assignments\n- Remove direct swimmer assignments\n- NOT delete the coach account\n\nContinue?`
      if (!confirm(message)) return
    } else {
      if (!confirm(`Remove ${coach.full_name} as a coach?\n\nThis will change their role but NOT delete their account.`)) return
    }

    const supabase = createClient()
    try {
      // Delete all coach assignments first
      if (assignmentCount > 0) {
        const { error: assignmentError } = await supabase
          .from('coach_assignments')
          .delete()
          .eq('coach_id', coach.id)
        
        if (assignmentError) {
          console.error('Assignment delete error:', assignmentError)
          throw assignmentError
        }
      }

      // Remove coach_id from directly assigned swimmers
      if (swimmerCount > 0) {
        const { error: swimmerError } = await supabase
          .from('swimmers')
          .update({ coach_id: null })
          .eq('coach_id', coach.id)
        
        if (swimmerError) {
          console.error('Swimmer update error:', swimmerError)
          throw swimmerError
        }
      }

      // Change role from 'coach' to 'parent'
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'parent', coach_squad_id: null, coach_schedule: null })
        .eq('id', coach.id)

      if (roleError) {
        console.error('Role update error:', roleError)
        throw roleError
      }

      toast.success('Coach removed successfully')
      
      // Reload data after successful removal
      await loadAllData()
    } catch (error) {
      console.error('Error removing coach:', error)
      if (error?.message) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to remove coach')
      }
    }
  }

  const getCoachWorkload = (coachId) => {
    const coachAssignments = assignments.filter(a => a.coach_id === coachId)
    const squadCount = coachAssignments.filter(a => a.squad_id).length
    const swimmerCount = coachAssignments.filter(a => a.swimmer_id).length
    const directSwimmers = swimmers.filter(s => s.coach_id === coachId).length
    
    return { squadCount, swimmerCount, directSwimmers, total: squadCount + swimmerCount + directSwimmers }
  }

  const coachColumns = [
    { 
      header: 'Name', 
      accessor: 'full_name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.full_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.email}</p>
        </div>
      )
    },
    {
      header: 'Pay / session',
      accessor: 'per_session_rate_kes',
      render: (row) => (
        <span className="text-sm tabular-nums">
          {row.per_session_rate_kes != null && row.per_session_rate_kes !== ''
            ? `KES ${Number(row.per_session_rate_kes).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}`
            : '—'}
        </span>
      ),
    },
    { 
      header: 'Assignments', 
      accessor: 'assignments',
      render: (row) => {
        const workload = getCoachWorkload(row.id)
        const coachAssignments = assignments.filter(a => a.coach_id === row.id)
        const assignedSquads = coachAssignments.filter(a => a.squad_id).map(a => a.squads?.name || a.squad_id)
        
        return (
          <div className="text-sm">
            {assignedSquads.length > 0 ? (
              <div className="flex flex-wrap gap-1 mb-1">
                {assignedSquads.map((name, idx) => (
                  <Badge key={idx} variant="info" size="sm">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs mb-1">No squad assignments</p>
            )}
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              {workload.swimmerCount + workload.directSwimmers} individual swimmer{(workload.swimmerCount + workload.directSwimmers) !== 1 ? 's' : ''}
            </p>
          </div>
        )
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      noWrap: false,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5 max-w-[22rem]">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedCoach(row)
              setAssignForm({ coach_id: row.id, squad_id: '', swimmer_id: '', notes: '' })
              setShowAssignModal(true)
            }}
          >
            Assign
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEditCoachModal(row)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openViewAssignmentsModal(row)}>
            Assignments
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleRemoveCoach(row)}>
            Remove
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading coaches...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coach Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage coaches and their assignments</p>
          </div>

          {/* Coaches Section */}
          <Card title="Coaches" padding="normal" className="mb-6">
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How to add coaches:</strong>
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 mt-2 ml-4 list-decimal space-y-1">
                <li>User creates an account via signup page</li>
                <li>Admin assigns the user with the role of 'Coach'</li>
                <li>Once registered, they'll appear here automatically</li>
                <li>Use the 'Assign' button to assign them to squads or swimmers</li>
              </ol>
              {coaches.length === 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ⚠️ <strong>No coaches found.</strong> Make sure coach users have signed up with the "coach" role selected.
                  </p>
                </div>
              )}
            </div>
            <Table
              columns={coachColumns}
              data={coaches}
              emptyMessage="No coaches found. Coach accounts need to signup first with 'coach' role selected."
            />
          </Card>
        </div>
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedCoach(null)
        }}
        title="Create Coach Assignment"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAssignModal(false)
                setSelectedCoach(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment} loading={saving}>
              Create Assignment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Coach"
            required
            value={assignForm.coach_id}
            onChange={(e) => setAssignForm({ ...assignForm, coach_id: e.target.value })}
            options={coaches.map(c => ({ 
              value: c.id, 
              label: `${c.full_name}${c.squads?.name ? ` (${c.squads.name})` : ''}`
            }))}
          />

          {/* Assignment Type Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assignment Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  value="squad"
                  checked={assignmentType === 'squad'}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Entire Squad</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  value="swimmer"
                  checked={assignmentType === 'swimmer'}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Individual Swimmer</span>
              </label>
            </div>
          </div>

          {assignmentType === 'squad' ? (
            <Select
              label="Squad"
              required
              value={assignForm.squad_id}
              onChange={(e) => setAssignForm({ ...assignForm, squad_id: e.target.value, swimmer_id: '' })}
              options={squadList.map(s => ({ value: s.id, label: s.name }))}
              helperText="Coach will oversee all swimmers in this squad"
            />
          ) : (
            <Select
              label="Swimmer"
              required
              value={assignForm.swimmer_id}
              onChange={(e) => setAssignForm({ ...assignForm, swimmer_id: e.target.value, squad_id: '' })}
              options={swimmers.map(s => ({ 
                value: s.id, 
                label: `${s.first_name} ${s.last_name} (${s.squads?.name || 'No squad'}) - ${s.status}`
              }))}
              helperText="Coach will work with this specific swimmer"
            />
          )}

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> {assignmentType === 'squad' 
                ? 'Squad assignments automatically include all current and future swimmers in that squad.'
                : 'Individual assignments override squad assignments for specific swimmers.'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Coach Modal */}
      <Modal
        isOpen={showEditCoachModal}
        onClose={() => {
          setShowEditCoachModal(false)
          setSelectedCoach(null)
        }}
        title="Edit Coach Details"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditCoachModal(false)
                setSelectedCoach(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditCoach} loading={saving}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            value={editCoachForm.full_name}
            onChange={(e) => setEditCoachForm({ ...editCoachForm, full_name: e.target.value })}
            placeholder="Coach full name"
          />
          <Input
            label="Email"
            type="email"
            required
            value={editCoachForm.email}
            onChange={(e) => setEditCoachForm({ ...editCoachForm, email: e.target.value })}
            placeholder="coach@example.com"
          />
          <Select
            label="Primary Squad"
            value={editCoachForm.coach_squad_id}
            onChange={(e) => setEditCoachForm({ ...editCoachForm, coach_squad_id: e.target.value })}
            options={[
              { value: '', label: 'Not Set' },
              ...squadList.map(s => ({ value: s.id, label: s.name }))
            ]}
            helperText="Primary squad for this coach"
          />
          <Input
            label="Per session rate (KES)"
            type="text"
            inputMode="decimal"
            value={editCoachForm.per_session_rate_kes}
            onChange={(e) =>
              setEditCoachForm({ ...editCoachForm, per_session_rate_kes: e.target.value })
            }
            placeholder="e.g. 2500"
            helperText="Used for automated session pay notifications. Leave empty to disable."
          />
        </div>
      </Modal>

      {/* View Assignments Modal */}
      <Modal
        isOpen={showViewAssignmentsModal}
        onClose={() => {
          setShowViewAssignmentsModal(false)
          setSelectedCoach(null)
        }}
        title={selectedCoach ? `Assignments - ${selectedCoach.full_name}` : 'Coach Assignments'}
        size="lg"
      >
        {selectedCoach && (
          <div className="space-y-4">
            {(() => {
              const coachAssignments = assignments.filter(a => a.coach_id === selectedCoach.id)
              const directSwimmers = swimmers.filter(s => s.coach_id === selectedCoach.id)
              
              if (coachAssignments.length === 0 && directSwimmers.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No assignments found for this coach.</p>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="mt-4"
                      onClick={() => {
                        setShowViewAssignmentsModal(false)
                        setAssignForm({ coach_id: selectedCoach.id, squad_id: '', swimmer_id: '', notes: '' })
                        setShowAssignModal(true)
                      }}
                    >
                      Create Assignment
                    </Button>
                  </div>
                )
              }

              return (
                <>
                  {coachAssignments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Squad Assignments</h3>
                      <div className="space-y-2">
                        {coachAssignments.map(assignment => (
                          <div 
                            key={assignment.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {assignment.squad_id 
                                  ? (assignment.squads?.name || assignment.squad_id)
                                  : `${assignment.swimmers?.first_name} ${assignment.swimmers?.last_name}`
                                }
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setShowViewAssignmentsModal(false)
                                handleDeleteAssignment(assignment)
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {directSwimmers.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Direct Swimmer Assignments</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        These swimmers are directly assigned via the Swimmers page
                      </p>
                      <div className="space-y-2">
                        {directSwimmers.map(swimmer => (
                          <div 
                            key={swimmer.id}
                            className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {swimmer.first_name} {swimmer.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {swimmer.squads?.name || 'Squad pending'}
                              </p>
                            </div>
                            <Badge variant="info" size="sm">Direct</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </Modal>

      <Footer />
    </>
  )
}
