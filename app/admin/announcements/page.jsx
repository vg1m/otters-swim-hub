'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import HCaptchaWidget from '@/components/auth/HCaptchaWidget'
import { isHcaptchaRequiredOnClient } from '@/lib/hcaptcha/client-config'

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', link_url: '' })
  const [hcaptchaToken, setHcaptchaToken] = useState(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const captchaRequired = isHcaptchaRequiredOnClient()

  function openPublishModal() {
    setHcaptchaToken(null)
    setCaptchaResetKey((k) => k + 1)
    setShowModal(true)
  }

  function closePublishModal() {
    if (publishing) return
    setShowModal(false)
    setHcaptchaToken(null)
    setCaptchaResetKey((k) => k + 1)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setAnnouncements(json.announcements || [])
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = user ? profileCache.get(user.id) : null
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cached?.role !== 'admin')) {
        router.push('/login')
        return
      }
      load()
    }
  }, [user, profile, authLoading, router, load])

  async function handlePublish(e) {
    e.preventDefault()
    const title = form.title.trim()
    const body = form.body.trim()
    if (!title || !body) {
      toast.error('Title and message are required')
      return
    }
    if (captchaRequired && !hcaptchaToken) {
      toast.error('Please complete the security check')
      return
    }
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          link_url: form.link_url.trim() || null,
          ...(hcaptchaToken ? { hcaptchaToken } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Publish failed')
      toast.success(
        json.fanOutQueued
          ? 'Published☺️ Notifications and emails are being sent in the background'
          : `Published☺️ ${json.parentsNotified ?? 0} parents, ${json.staffNotified ?? 0} staff notified`
      )
      setShowModal(false)
      setForm({ title: '', body: '', link_url: '' })
      setHcaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      await load()
    } catch (err) {
      toast.error(err.message || 'Publish failed')
      setHcaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
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
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Club announcements</h1>
            <p className="text-sm text-stone-600 dark:text-gray-400 mt-1">
              Send to all parents and coaches (in-app + email). Publish saves immediately; notifications
              continue in the background. One publish per minute.
            </p>
          </div>
          <Button onClick={openPublishModal}>New announcement</Button>
        </div>

        <Card>
          {loading ? (
            <p className="text-stone-500 dark:text-gray-400 p-4">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-stone-500 dark:text-gray-400 p-4">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-gray-700">
              {announcements.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex justify-between gap-4">
                    <h2 className="font-semibold text-stone-900 dark:text-white">{a.title}</h2>
                    <time className="text-xs text-stone-500 shrink-0">
                      {new Date(a.published_at).toLocaleString('en-GB')}
                    </time>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary mt-2 inline-block"
                    >
                      {a.link_url}
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
        onClose={closePublishModal}
        title="Publish club announcement"
      >
        <form onSubmit={handlePublish} className="space-y-4">
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
            placeholder="https://"
          />
          <p className="text-xs text-stone-500">
            This notifies every parent and every coach/admin immediately. Cannot be edited after publish.
          </p>
          <HCaptchaWidget
            resetKey={captchaResetKey}
            onVerify={(token) => setHcaptchaToken(token)}
            onExpire={() => setHcaptchaToken(null)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closePublishModal} disabled={publishing}>
              Cancel
            </Button>
            <Button type="submit" disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
