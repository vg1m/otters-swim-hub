'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import toast from 'react-hot-toast'

const AUDIENCE_OPTIONS = [
  { value: 'parents_in_my_squads', label: 'To parents (my squads)' },
  { value: 'coaches', label: 'To coaches & admins' },
]

const AUDIENCE_LABEL = {
  parents_in_my_squads: 'Parents in my squads',
  coaches: 'Coaches & admins',
}

export default function CoachBroadcastPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [form, setForm] = useState({
    audience: 'parents_in_my_squads',
    title: '',
    body: '',
    link_url: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coach/broadcast')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setBroadcasts(json.broadcasts || [])
    } catch (e) {
      toast.error(e.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (profile?.role !== 'coach') {
      router.push('/dashboard')
      return
    }
    load()
  }, [user, profile, authLoading, router, load])

  async function handlePublish(e) {
    e.preventDefault()
    setPublishing(true)
    try {
      const res = await fetch('/api/coach/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Send failed')
      const msg =
        form.audience === 'coaches'
          ? `Sent — ${json.staffNotified ?? 0} staff notified`
          : `Sent — ${json.parentsNotified ?? 0} parents notified`
      toast.success(msg)
      setShowModal(false)
      setForm({ audience: 'parents_in_my_squads', title: '', body: '', link_url: '' })
      await load()
    } catch (err) {
      toast.error(err.message || 'Send failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Broadcast</h1>
            <p className="text-sm text-stone-600 dark:text-gray-400 mt-1">
              Message parents in your squads or other coaches. One send per minute.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>Compose</Button>
        </div>

        <Card>
          {loading ? (
            <p className="p-4 text-stone-500">Loading…</p>
          ) : broadcasts.length === 0 ? (
            <p className="p-4 text-stone-500">No messages sent yet.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-gray-700">
              {broadcasts.map((b) => (
                <li key={b.id} className="p-4">
                  <div className="flex justify-between gap-4">
                    <h2 className="font-semibold text-stone-900 dark:text-white">{b.title}</h2>
                    <span className="text-xs text-stone-500 shrink-0">
                      {AUDIENCE_LABEL[b.audience] || b.audience}
                    </span>
                  </div>
                  <time className="text-xs text-stone-500">
                    {new Date(b.published_at).toLocaleString('en-GB')}
                  </time>
                  <p className="text-sm text-stone-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                    {b.body}
                  </p>
                  {b.link_url && (
                    <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary mt-1 inline-block">
                      {b.link_url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
      <Footer />

      <Modal
        isOpen={showModal}
        onClose={() => !publishing && setShowModal(false)}
        title="Send broadcast"
      >
        <form onSubmit={handlePublish} className="space-y-4">
          <Select
            label="Audience"
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            options={AUDIENCE_OPTIONS}
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={200}
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[120px]"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Optional link"
            value={form.link_url}
            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button type="submit" disabled={publishing}>
              {publishing ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
