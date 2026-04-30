'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { formatKES } from '@/lib/utils/currency'
import toast from 'react-hot-toast'

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64)
}

export default function AdminSquadsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [squads, setSquads] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [squadSearch, setSquadSearch] = useState('')
  const [form, setForm] = useState({
    slug: '',
    name: '',
    sort_order: '0',
    is_active: true,
    monthly_fee: '',
    quarterly_fee: '',
    early_bird_eligible: false,
    description: '',
  })

  useEffect(() => {
    const cached = user ? profileCache.get(user.id) : null
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cached?.role !== 'admin')) {
        router.push('/login')
        return
      }
    }
    if (user) loadSquads()
  }, [user, profile, authLoading, router])

  async function loadSquads() {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setSquads(data || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load squads')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = useCallback(() => {
    setSelected(null)
    setForm({
      slug: '',
      name: '',
      sort_order: String((squads[squads.length - 1]?.sort_order ?? 0) + 1),
      is_active: true,
      monthly_fee: '',
      quarterly_fee: '',
      early_bird_eligible: false,
      description: '',
    })
    setShowModal(true)
  }, [squads])

  const openEditModal = useCallback((row) => {
    setSelected(row)
    setForm({
      slug: row.slug,
      name: row.name,
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active,
      monthly_fee: String(row.monthly_fee),
      quarterly_fee: row.quarterly_fee != null ? String(row.quarterly_fee) : '',
      early_bird_eligible: !!row.early_bird_eligible,
      description: row.description || '',
    })
    setShowModal(true)
  }, [])

  const requestDeactivate = useCallback(async (row) => {
    if (
      !confirm(
        `Deactivate squad "${row.name}"? It will be hidden from new assignments if marked inactive, or delete only if unused.`
      )
    ) {
      return
    }
    const supabase = createClient()
    try {
      const { error } = await supabase.from('squads').update({ is_active: false }).eq('id', row.id)
      if (error) throw error
      toast.success('Squad deactivated')
      loadSquads()
    } catch (e) {
      console.error(e)
      toast.error('Could not update squad (may still be in use)')
    }
  }, [])

  const requestReactivate = useCallback(async (row) => {
    if (!confirm(`Reactivate squad "${row.name}"? It will appear again for assignments and fee configuration.`)) {
      return
    }
    const supabase = createClient()
    try {
      const { error } = await supabase.from('squads').update({ is_active: true }).eq('id', row.id)
      if (error) throw error
      toast.success('Squad reactivated')
      loadSquads()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Could not reactivate squad')
    }
  }, [])

  const filteredSquads = useMemo(() => {
    const q = squadSearch.trim().toLowerCase()
    if (!q) return squads
    return squads.filter((row) => {
      const monthlyStr = formatKES(Number(row.monthly_fee))
      const quarterlyStr =
        row.quarterly_fee != null ? formatKES(Number(row.quarterly_fee)) : 'n/a'
      const haystack = [
        row.name,
        row.slug,
        row.description || '',
        String(row.monthly_fee ?? ''),
        row.quarterly_fee != null ? String(row.quarterly_fee) : '',
        monthlyStr,
        quarterlyStr,
        row.early_bird_eligible ? 'early bird yes' : 'early bird no',
        row.is_active ? 'active' : 'inactive',
        String(row.sort_order ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [squads, squadSearch])

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    const monthly = parseFloat(form.monthly_fee)
    if (Number.isNaN(monthly) || monthly < 0) {
      toast.error('Valid monthly fee is required')
      return
    }
    let quarterly = null
    if (form.quarterly_fee !== '' && form.quarterly_fee != null) {
      const q = parseFloat(form.quarterly_fee)
      if (Number.isNaN(q) || q < 0) {
        toast.error('Invalid quarterly fee')
        return
      }
      quarterly = q
    }

    const slug = selected ? selected.slug : slugify(form.slug || form.name)
    if (!slug) {
      toast.error('Slug could not be derived. Use letters/numbers in the name.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      const payload = {
        name: form.name.trim(),
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: form.is_active,
        monthly_fee: monthly,
        quarterly_fee: quarterly,
        early_bird_eligible: form.early_bird_eligible,
        description: form.description.trim() || null,
      }
      if (!selected) {
        payload.slug = slug
        const { error } = await supabase.from('squads').insert(payload)
        if (error) throw error
        toast.success('Squad created')
      } else {
        const { error } = await supabase.from('squads').update(payload).eq('id', selected.id)
        if (error) throw error
        toast.success('Squad updated')
      }
      setShowModal(false)
      setSelected(null)
      loadSquads()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo(
    () => [
      { header: 'Name', accessor: 'name' },
      { header: 'Slug', accessor: 'slug' },
      {
        header: 'Monthly',
        accessor: 'monthly_fee',
        render: (r) => formatKES(Number(r.monthly_fee)),
      },
      {
        header: 'Quarterly',
        accessor: 'quarterly_fee',
        render: (r) => (r.quarterly_fee != null ? formatKES(Number(r.quarterly_fee)) : 'N/A'),
      },
      {
        header: 'Early bird',
        accessor: 'early_bird_eligible',
        render: (r) => (r.early_bird_eligible ? 'Yes' : 'No'),
      },
      {
        header: 'Active',
        accessor: 'is_active',
        render: (r) => (r.is_active ? 'Yes' : 'No'),
      },
      {
        header: 'Actions',
        accessor: 'actions',
        render: (row) => (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              Edit
            </Button>
            {row.is_active ? (
              <Button size="sm" variant="danger" onClick={() => requestDeactivate(row)}>
                Deactivate
              </Button>
            ) : (
              <Button size="sm" variant="success" onClick={() => requestReactivate(row)}>
                Reactivate
              </Button>
            )}
          </div>
        ),
      },
    ],
    [openEditModal, requestDeactivate, requestReactivate]
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const payPerSessionNote =
    '"Pay per session" is a per-swimmer billing option, not a squad. Every swimmer is placed in a real squad (Elite, Development, Pups, Masters) and parents separately choose monthly, quarterly, or per-session payment.'

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 md:mb-8 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Squads
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                  Manage squad names, fees, and training tiers. Parents do not choose a squad at registration.
                </p>
                <details className="mt-2 md:hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 select-none list-none [&::-webkit-details-marker]:hidden flex items-center gap-1">
                    <span className="text-gray-400" aria-hidden>
                      ▶
                    </span>
                    Pay-per-session vs squads
                  </summary>
                  <p className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 leading-relaxed pl-1">
                    Note: {payPerSessionNote}
                  </p>
                </details>
                <p className="hidden md:block text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Note: {payPerSessionNote}
                </p>
              </div>
              <Button fullWidth className="md:w-auto md:shrink-0 md:min-w-[12rem]" onClick={openAddModal}>
                + Add Squad
              </Button>
            </div>
          </div>

          <Card padding="normal" className="mb-4 md:mb-6">
            <label htmlFor="admin-squads-search" className="sr-only">
              Search squads
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                id="admin-squads-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={squadSearch}
                onChange={(e) => setSquadSearch(e.target.value)}
                placeholder="Search name, slug, fees, active, early bird…"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-11 text-base text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 sm:py-2.5 sm:text-sm min-h-[48px] sm:min-h-0"
              />
              {squadSearch ? (
                <button
                  type="button"
                  onClick={() => setSquadSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
            {squadSearch.trim() && squads.length > 0 ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredSquads.length} of {squads.length} squad{squads.length !== 1 ? 's' : ''}
              </p>
            ) : null}
          </Card>

          <Card padding="none">
            {squads.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No squads yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your first squad to get started.</p>
                <div className="mt-6">
                  <Button onClick={openAddModal}>+ Add Squad</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="md:hidden">
                  {filteredSquads.length === 0 ? (
                    <div className="px-4 py-12 text-center space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">No squads match your search.</p>
                      <Button variant="secondary" size="sm" onClick={() => setSquadSearch('')}>
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredSquads.map((row) => (
                        <div key={row.id} className="p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-base text-gray-900 dark:text-gray-100">{row.name}</p>
                              <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                                {row.slug}
                              </p>
                            </div>
                            <Badge
                              variant={row.is_active ? 'success' : 'default'}
                              className="shrink-0 capitalize"
                            >
                              {row.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Monthly</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {formatKES(Number(row.monthly_fee))}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Quarterly</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {row.quarterly_fee != null ? formatKES(Number(row.quarterly_fee)) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Early bird</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {row.early_bird_eligible ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Sort order</p>
                              <p className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                                {row.sort_order ?? 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <Button
                              className="w-full sm:flex-1"
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditModal(row)}
                            >
                              Edit
                            </Button>
                            {row.is_active ? (
                              <Button
                                className="w-full sm:flex-1"
                                size="sm"
                                variant="danger"
                                onClick={() => requestDeactivate(row)}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                className="w-full sm:flex-1"
                                size="sm"
                                variant="success"
                                onClick={() => requestReactivate(row)}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  {filteredSquads.length === 0 ? (
                    <div className="px-6 py-12 text-center space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">No squads match your search.</p>
                      <Button variant="secondary" size="sm" onClick={() => setSquadSearch('')}>
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <Table columns={columns} data={filteredSquads} emptyMessage="No squads yet" />
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelected(null)
        }}
        title={selected ? 'Edit Squad' : 'Add Squad'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {selected ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!selected && (
            <Input
              label="Slug (optional)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. pups (auto from name if empty)"
              helperText="Stable ID for integrations; cannot be changed after create"
            />
          )}
          {selected && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Slug: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{selected.slug}</code> (fixed)
              </p>
            </div>
          )}
          <Input
            className="md:col-span-2"
            label="Display name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Sort order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
          <Select
            label="Active"
            value={form.is_active ? 'true' : 'false'}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]}
            helperText={
              selected
                ? 'Set to No to deactivate, or Yes to reactivate (you can also use Reactivate in the squad list).'
                : undefined
            }
          />
          <Input
            label="Monthly training fee (KES)"
            type="number"
            required
            min="0"
            step="1"
            value={form.monthly_fee}
            onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
          />
          <Input
            label="Quarterly fee (KES, optional)"
            type="number"
            min="0"
            step="1"
            value={form.quarterly_fee}
            onChange={(e) => setForm({ ...form, quarterly_fee: e.target.value })}
            helperText="Leave empty if this squad has no quarterly option"
          />
          <label className="flex items-center gap-2 md:col-span-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.early_bird_eligible}
              onChange={(e) => setForm({ ...form, early_bird_eligible: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">
              Eligible for early-bird discount (monthly)
            </span>
          </label>
          <Input
            className="md:col-span-2"
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </Modal>

      <Footer />
    </>
  )
}
