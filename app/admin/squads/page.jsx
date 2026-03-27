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
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
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
      toast.error('Slug could not be derived — use letters/numbers in the name')
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

  async function handleDelete(row) {
    if (!confirm(`Deactivate squad "${row.name}"? It will be hidden from new assignments if marked inactive, or delete only if unused.`)) {
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
  }

  const columns = [
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
      render: (r) => (r.quarterly_fee != null ? formatKES(Number(r.quarterly_fee)) : '—'),
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
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
            }}
          >
            Edit
          </Button>
          {row.is_active && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
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
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Squads</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage squad names, fees, and training tiers. Parents do not choose a squad at registration.
              </p>
            </div>
            <Button
              onClick={() => {
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
              }}
            >
              + Add Squad
            </Button>
          </div>

          <Card padding="none">
            <Table columns={columns} data={squads} emptyMessage="No squads yet" />
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
              placeholder="e.g. pups — auto from name if empty"
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
            <span className="text-sm text-gray-800 dark:text-gray-200">Eligible for early-bird discount (monthly)</span>
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
