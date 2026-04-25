'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import { buildDirectionsUrl } from '@/lib/facilities/directions'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import toast from 'react-hot-toast'

export default function FacilityManagementPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [facilities, setFacilities] = useState([])
  const [schedules, setSchedules] = useState([])
  const [squadList, setSquadList] = useState([])
  const [capacityRules, setCapacityRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFacilityModal, setShowFacilityModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showCapacityModal, setShowCapacityModal] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedCapacity, setSelectedCapacity] = useState(null)
  const [saving, setSaving] = useState(false)

  const [facilityForm, setFacilityForm] = useState({
    name: '',
    lanes: '',
    pool_length: '',
    address: '',
  })

  const [scheduleForm, setScheduleForm] = useState({
    facility_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    squad_ids: [],
  })

  const [capacityForm, setCapacityForm] = useState({
    sub_squad: '',
    swimmers_per_lane: '',
  })

  const [facilitiesListExpanded, setFacilitiesListExpanded] = useState(true)
  const [schedulesListExpanded, setSchedulesListExpanded] = useState(true)
  const [capacityListExpanded, setCapacityListExpanded] = useState(true)

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
      const [facilitiesRes, schedulesRes, capacityRes, squadsRes] = await Promise.all([
        supabase.from('facilities').select('*').order('name'),
        supabase
          .from('facility_schedules')
          .select(
            `
            *,
            facilities(name),
            facility_schedule_squads (
              squad_id,
              squads (id, name)
            )
          `
          )
          .order('facility_id'),
        supabase.from('lane_capacity_rules').select('*').order('sub_squad'),
        supabase.from('squads').select('id, name').eq('is_active', true).order('sort_order').order('name'),
      ])

      if (facilitiesRes.error) throw facilitiesRes.error
      if (schedulesRes.error) throw schedulesRes.error
      if (capacityRes.error) throw capacityRes.error
      if (squadsRes.error) throw squadsRes.error

      setFacilities(facilitiesRes.data || [])
      setSchedules(schedulesRes.data || [])
      setSquadList(squadsRes.data || [])
      setCapacityRules(capacityRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load facility data')
    } finally {
      setLoading(false)
    }
  }

  // Facility CRUD
  async function handleSaveFacility() {
    if (!facilityForm.name || !facilityForm.lanes || !facilityForm.pool_length) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (selectedFacility) {
        const { error } = await supabase
          .from('facilities')
          .update({
            name: facilityForm.name,
            lanes: parseInt(facilityForm.lanes),
            pool_length: parseInt(facilityForm.pool_length),
            address: facilityForm.address,
          })
          .eq('id', selectedFacility.id)

        if (error) throw error
        toast.success('Facility updated successfully')
      } else {
        const { error } = await supabase
          .from('facilities')
          .insert({
            name: facilityForm.name,
            lanes: parseInt(facilityForm.lanes),
            pool_length: parseInt(facilityForm.pool_length),
            address: facilityForm.address,
          })

        if (error) throw error
        toast.success('Facility created successfully')
      }

      setShowFacilityModal(false)
      setSelectedFacility(null)
      loadAllData()
    } catch (error) {
      console.error('Error saving facility:', error)
      toast.error('Failed to save facility')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteFacility(facility) {
    if (!confirm(`Delete ${facility.name}? This will also delete all associated schedules.`)) {
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facility.id)

      if (error) throw error
      toast.success('Facility deleted')
      loadAllData()
    } catch (error) {
      console.error('Error deleting facility:', error)
      toast.error('Failed to delete facility')
    }
  }

  // Schedule CRUD
  async function handleSaveSchedule() {
    if (
      !scheduleForm.facility_id ||
      !scheduleForm.day_of_week ||
      !scheduleForm.start_time ||
      !scheduleForm.end_time ||
      !scheduleForm.squad_ids?.length
    ) {
      toast.error('Please fill in all required fields and select at least one squad')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let scheduleId = selectedSchedule?.id

      if (selectedSchedule) {
        const { error } = await supabase
          .from('facility_schedules')
          .update({
            facility_id: scheduleForm.facility_id,
            day_of_week: parseInt(scheduleForm.day_of_week, 10),
            start_time: scheduleForm.start_time,
            end_time: scheduleForm.end_time,
          })
          .eq('id', selectedSchedule.id)

        if (error) throw error
        await supabase.from('facility_schedule_squads').delete().eq('schedule_id', selectedSchedule.id)
        toast.success('Schedule updated successfully')
      } else {
        const { data: inserted, error } = await supabase
          .from('facility_schedules')
          .insert({
            facility_id: scheduleForm.facility_id,
            day_of_week: parseInt(scheduleForm.day_of_week, 10),
            start_time: scheduleForm.start_time,
            end_time: scheduleForm.end_time,
          })
          .select('id')
          .single()

        if (error) throw error
        scheduleId = inserted.id
        toast.success('Schedule created successfully')
      }

      const junctionRows = scheduleForm.squad_ids.map((squad_id) => ({
        schedule_id: scheduleId,
        squad_id,
      }))
      const { error: jErr } = await supabase.from('facility_schedule_squads').insert(junctionRows)
      if (jErr) throw jErr

      setShowScheduleModal(false)
      setSelectedSchedule(null)
      loadAllData()
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSchedule(schedule) {
    if (!confirm('Delete this schedule?')) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('facility_schedules')
        .delete()
        .eq('id', schedule.id)

      if (error) throw error
      toast.success('Schedule deleted')
      loadAllData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('Failed to delete schedule')
    }
  }

  // Capacity CRUD
  async function handleSaveCapacity() {
    if (!capacityForm.sub_squad || !capacityForm.swimmers_per_lane) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (selectedCapacity) {
        const { error } = await supabase
          .from('lane_capacity_rules')
          .update({
            sub_squad: capacityForm.sub_squad,
            swimmers_per_lane: parseInt(capacityForm.swimmers_per_lane),
          })
          .eq('id', selectedCapacity.id)

        if (error) throw error
        toast.success('Capacity rule updated')
      } else {
        const { error } = await supabase
          .from('lane_capacity_rules')
          .insert({
            sub_squad: capacityForm.sub_squad,
            swimmers_per_lane: parseInt(capacityForm.swimmers_per_lane),
          })

        if (error) throw error
        toast.success('Capacity rule created')
      }

      setShowCapacityModal(false)
      setSelectedCapacity(null)
      loadAllData()
    } catch (error) {
      console.error('Error saving capacity:', error)
      toast.error('Failed to save capacity rule')
    } finally {
      setSaving(false)
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  function scheduleSquadLabel(row) {
    const links = row.facility_schedule_squads || []
    if (!links.length) return 'N/A'
    return links
      .map((l) => l.squads?.name || '')
      .filter(Boolean)
      .join(', ')
  }

  function toggleScheduleSquad(id) {
    setScheduleForm((prev) => {
      const set = new Set(prev.squad_ids || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, squad_ids: [...set] }
    })
  }

  const facilityColumns = [
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Pool Size', 
      accessor: 'pool_size',
      render: (row) => `${row.lanes} lanes, ${row.pool_length}M`
    },
    {
      header: 'Address',
      accessor: 'address',
      render: (row) => {
        const url = buildDirectionsUrl(row)
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-900 dark:text-gray-100">
              {row.address || 'N/A'}
            </span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline dark:text-primary-light"
              >
                Get directions →
              </a>
            )}
          </div>
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
            onClick={() => {
              setSelectedFacility(row)
              setFacilityForm({
                name: row.name,
                lanes: row.lanes.toString(),
                pool_length: row.pool_length.toString(),
                address: row.address || '',
              })
              setShowFacilityModal(true)
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteFacility(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const scheduleColumns = [
    { 
      header: 'Facility', 
      accessor: 'facility',
      render: (row) => row.facilities?.name || 'Unknown'
    },
    { 
      header: 'Day', 
      accessor: 'day',
      render: (row) => dayNames[row.day_of_week]
    },
    { 
      header: 'Time', 
      accessor: 'time',
      render: (row) => `${row.start_time} - ${row.end_time}`
    },
    {
      header: 'Squads',
      accessor: 'squads_col',
      render: (row) => scheduleSquadLabel(row),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedSchedule(row)
              setScheduleForm({
                facility_id: row.facility_id,
                day_of_week: row.day_of_week.toString(),
                start_time: row.start_time,
                end_time: row.end_time,
                squad_ids: (row.facility_schedule_squads || []).map((l) => l.squad_id),
              })
              setShowScheduleModal(true)
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteSchedule(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const capacityColumns = [
    { 
      header: 'Level', 
      accessor: 'sub_squad',
      render: (row) => row.sub_squad.toUpperCase()
    },
    { 
      header: 'Swimmers per Lane', 
      accessor: 'swimmers_per_lane'
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedCapacity(row)
            setCapacityForm({
              sub_squad: row.sub_squad,
              swimmers_per_lane: row.swimmers_per_lane.toString(),
            })
            setShowCapacityModal(true)
          }}
        >
          Edit
        </Button>
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
            <p className="text-gray-600 dark:text-gray-400">Loading facilities...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Facility Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
              Manage swimming pools, schedules, and capacity rules
            </p>
          </div>

          {/* Facilities Section */}
          <Card
            title="Swimming Pools"
            padding="normal"
            className="mb-6"
            action={
              <button
                type="button"
                onClick={() => setFacilitiesListExpanded((v) => !v)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-expanded={facilitiesListExpanded}
                aria-label={
                  facilitiesListExpanded
                    ? 'Collapse swimming pools list'
                    : 'Expand swimming pools list'
                }
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${
                    facilitiesListExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            }
          >
            <div className="mb-4">
              <Button
                fullWidth
                className="md:w-auto md:shrink-0"
                onClick={() => {
                  setSelectedFacility(null)
                  setFacilityForm({ name: '', lanes: '', pool_length: '', address: '' })
                  setShowFacilityModal(true)
                }}
              >
                + Add Facility
              </Button>
            </div>
            {facilitiesListExpanded && (
              <>
                <div className="md:hidden -mx-6">
                  {facilities.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No facilities found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
                      {facilities.map((row) => {
                        const directionsUrl = buildDirectionsUrl(row)
                        return (
                          <div key={row.id} className="p-4 space-y-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Pool
                              </p>
                              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {row.name}
                              </p>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-gray-500 dark:text-gray-400">Pool size</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {row.lanes} lanes, {row.pool_length}M
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Address</span>
                                <p className="mt-0.5 text-gray-900 dark:text-gray-100 break-words">
                                  {row.address || 'N/A'}
                                </p>
                                {directionsUrl && (
                                  <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-xs font-medium text-primary hover:underline dark:text-primary-light"
                                  >
                                    Get directions →
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                              <Button
                                fullWidth
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedFacility(row)
                                  setFacilityForm({
                                    name: row.name,
                                    lanes: row.lanes.toString(),
                                    pool_length: row.pool_length.toString(),
                                    address: row.address || '',
                                  })
                                  setShowFacilityModal(true)
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                fullWidth
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteFacility(row)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={facilityColumns}
                    data={facilities}
                    emptyMessage="No facilities found"
                  />
                </div>
              </>
            )}
          </Card>

          {/* Schedules Section */}
          <Card
            title="Pool Schedules"
            padding="normal"
            className="mb-6"
            action={
              <button
                type="button"
                onClick={() => setSchedulesListExpanded((v) => !v)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-expanded={schedulesListExpanded}
                aria-label={
                  schedulesListExpanded
                    ? 'Collapse pool schedules list'
                    : 'Expand pool schedules list'
                }
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${
                    schedulesListExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            }
          >
            <div className="mb-4 space-y-2">
              <Button
                fullWidth
                className="md:w-auto md:shrink-0"
                onClick={() => {
                  setSelectedSchedule(null)
                  setScheduleForm({
                    facility_id: '',
                    day_of_week: '',
                    start_time: '',
                    end_time: '',
                    squad_ids: [],
                  })
                  setShowScheduleModal(true)
                }}
                disabled={facilities.length === 0}
              >
                + Add Schedule
              </Button>
              {facilities.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add a facility first before creating schedules
                </p>
              )}
            </div>
            {schedulesListExpanded && (
              <>
                <div className="md:hidden -mx-6">
                  {schedules.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No schedules configured
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
                      {schedules.map((row) => (
                        <div key={row.id} className="p-4 space-y-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Schedule
                            </p>
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {row.facilities?.name || 'Unknown facility'}
                            </p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Day</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {dayNames[row.day_of_week] ?? 'N/A'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Time</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {row.start_time} – {row.end_time}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Squads</span>
                              <p className="mt-0.5 text-gray-800 dark:text-gray-200 break-words">
                                {scheduleSquadLabel(row)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 pt-1">
                            <Button
                              fullWidth
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedSchedule(row)
                                setScheduleForm({
                                  facility_id: row.facility_id,
                                  day_of_week: row.day_of_week.toString(),
                                  start_time: row.start_time,
                                  end_time: row.end_time,
                                  squad_ids: (row.facility_schedule_squads || []).map((l) => l.squad_id),
                                })
                                setShowScheduleModal(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              fullWidth
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteSchedule(row)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={scheduleColumns}
                    data={schedules}
                    emptyMessage="No schedules configured"
                  />
                </div>
              </>
            )}
          </Card>

          {/* Capacity Rules Section */}
          <Card
            title="Lane Capacity Rules"
            padding="normal"
            action={
              <button
                type="button"
                onClick={() => setCapacityListExpanded((v) => !v)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-expanded={capacityListExpanded}
                aria-label={
                  capacityListExpanded
                    ? 'Collapse lane capacity rules list'
                    : 'Expand lane capacity rules list'
                }
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${
                    capacityListExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            }
          >
            <div className="mb-4">
              <Button
                fullWidth
                className="md:w-auto md:shrink-0"
                onClick={() => {
                  setSelectedCapacity(null)
                  setCapacityForm({ sub_squad: '', swimmers_per_lane: '' })
                  setShowCapacityModal(true)
                }}
              >
                + Add Rule
              </Button>
            </div>
            {capacityListExpanded && (
              <>
                <div className="md:hidden -mx-6">
                  {capacityRules.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No capacity rules defined
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
                      {capacityRules.map((row) => (
                        <div key={row.id} className="p-4 space-y-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Level</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {row.sub_squad.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Swimmers per lane</span>
                              <span className="text-gray-900 dark:text-gray-100">{row.swimmers_per_lane}</span>
                            </div>
                          </div>
                          <div className="pt-1">
                            <Button
                              fullWidth
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedCapacity(row)
                                setCapacityForm({
                                  sub_squad: row.sub_squad,
                                  swimmers_per_lane: row.swimmers_per_lane.toString(),
                                })
                                setShowCapacityModal(true)
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={capacityColumns}
                    data={capacityRules}
                    emptyMessage="No capacity rules defined"
                  />
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Facility Modal */}
      <Modal
        isOpen={showFacilityModal}
        onClose={() => {
          setShowFacilityModal(false)
          setSelectedFacility(null)
        }}
        title={selectedFacility ? 'Edit Facility' : 'Add Facility'}
        size="md"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              fullWidth
              className="sm:w-auto"
              variant="secondary"
              onClick={() => {
                setShowFacilityModal(false)
                setSelectedFacility(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={handleSaveFacility}
              loading={saving}
            >
              {selectedFacility ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Facility Name"
            required
            value={facilityForm.name}
            onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
            placeholder="e.g., Aga Khan Sports Club"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Number of Lanes"
              type="number"
              required
              min="1"
              value={facilityForm.lanes}
              onChange={(e) => setFacilityForm({ ...facilityForm, lanes: e.target.value })}
            />
            <Input
              label="Pool Length (meters)"
              type="number"
              required
              min="1"
              value={facilityForm.pool_length}
              onChange={(e) => setFacilityForm({ ...facilityForm, pool_length: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            value={facilityForm.address}
            onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
            placeholder="e.g., Aga Khan location"
          />
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false)
          setSelectedSchedule(null)
        }}
        title={selectedSchedule ? 'Edit Schedule' : 'Add Schedule'}
        size="md"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              fullWidth
              className="sm:w-auto"
              variant="secondary"
              onClick={() => {
                setShowScheduleModal(false)
                setSelectedSchedule(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={handleSaveSchedule}
              loading={saving}
            >
              {selectedSchedule ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Facility"
            required
            value={scheduleForm.facility_id}
            onChange={(e) => setScheduleForm({ ...scheduleForm, facility_id: e.target.value })}
            options={facilities.map(f => ({ value: f.id, label: f.name }))}
          />
          <Select
            label="Day of Week"
            required
            value={scheduleForm.day_of_week}
            onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
            options={dayNames.map((day, idx) => ({ value: idx.toString(), label: day }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              required
              value={scheduleForm.start_time}
              onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={scheduleForm.end_time}
              onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Squads (select all that apply)</p>
            <div className="flex flex-wrap gap-3 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              {squadList.length === 0 ? (
                <p className="text-sm text-gray-500">Add squads under Admin → Squads first.</p>
              ) : (
                squadList.map((sq) => (
                  <label key={sq.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={scheduleForm.squad_ids?.includes(sq.id)}
                      onChange={() => toggleScheduleSquad(sq.id)}
                      className="rounded border-gray-300"
                    />
                    {sq.name}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Capacity Modal */}
      <Modal
        isOpen={showCapacityModal}
        onClose={() => {
          setShowCapacityModal(false)
          setSelectedCapacity(null)
        }}
        title={selectedCapacity ? 'Edit Capacity Rule' : 'Add Capacity Rule'}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              fullWidth
              className="sm:w-auto"
              variant="secondary"
              onClick={() => {
                setShowCapacityModal(false)
                setSelectedCapacity(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={handleSaveCapacity}
              loading={saving}
            >
              {selectedCapacity ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Sub Squad Level"
            required
            value={capacityForm.sub_squad}
            onChange={(e) => setCapacityForm({ ...capacityForm, sub_squad: e.target.value })}
            options={[
              { value: 'elite', label: 'Elite' },
              { value: 'dev1', label: 'Dev 1' },
              { value: 'dev2', label: 'Dev 2' },
              { value: 'dev3', label: 'Dev 3' },
              { value: 'learn_to_swim', label: 'Learn to Swim' },
            ]}
            disabled={!!selectedCapacity}
            helperText={selectedCapacity ? 'Cannot change level, edit swimmers per lane only' : ''}
          />
          <Input
            label="Swimmers per Lane"
            type="number"
            required
            min="1"
            max="20"
            value={capacityForm.swimmers_per_lane}
            onChange={(e) => setCapacityForm({ ...capacityForm, swimmers_per_lane: e.target.value })}
          />
        </div>
      </Modal>

      <Footer />
    </>
  )
}
