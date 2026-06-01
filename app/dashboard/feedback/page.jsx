'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { UnreadNotificationIndicator } from '@/components/UnreadNotificationIndicator'
import { emitNotifierRefresh } from '@/lib/notifications/notifier-refresh'
import toast from 'react-hot-toast'
import HCaptchaWidget from '@/components/auth/HCaptchaWidget'
import { isHcaptchaRequiredOnClient } from '@/lib/hcaptcha/client-config'

const STATUS_LABEL = {
  open: 'Open',
  answered: 'Answered',
  closed: 'Closed',
}

export default function ParentFeedbackPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [unreadRepliesEnabled, setUnreadRepliesEnabled] = useState(true)
  const [hcaptchaToken, setHcaptchaToken] = useState(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const captchaRequired = isHcaptchaRequiredOnClient()

  const unreadRepliesCount = useMemo(
    () =>
      unreadRepliesEnabled
        ? items.filter(
            (item) =>
              item.status === 'answered' &&
              item.admin_response &&
              !item.parent_read_at
          ).length
        : 0,
    [items, unreadRepliesEnabled]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/parent/feedback')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setItems(json.feedback || [])
      setUnreadRepliesEnabled(json.unreadRepliesEnabled !== false)
    } catch (e) {
      toast.error(e.message || 'Failed to load feedback')
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
    if (profile?.role && profile.role !== 'parent') {
      router.push('/dashboard')
      return
    }
    load()
  }, [user, profile, authLoading, router, load])

  useEffect(() => {
    if (!unreadRepliesEnabled || !items.length || unreadRepliesCount === 0) return
    fetch('/api/parent/feedback/mark-read', { method: 'POST' })
      .then(() => {
        const now = new Date().toISOString()
        setItems((prev) =>
          prev.map((item) =>
            item.status === 'answered' && item.admin_response && !item.parent_read_at
              ? { ...item, parent_read_at: now }
              : item
          )
        )
        emitNotifierRefresh()
      })
      .catch(() => {})
  }, [items.length, unreadRepliesCount, unreadRepliesEnabled])

  async function handleSubmit(e) {
    e.preventDefault()
    if (captchaRequired && !hcaptchaToken) {
      toast.error('Please complete the security check')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/parent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...(hcaptchaToken ? { hcaptchaToken } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submit failed')
      toast.success('Feedback sent — the club will respond soon')
      setForm({ subject: '', message: '' })
      setHcaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      await load()
    } catch (err) {
      toast.error(err.message || 'Submit failed')
      setHcaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Feedback</h1>
          {unreadRepliesCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
              {unreadRepliesCount} new {unreadRepliesCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-gray-400 mb-6">
          Send a message to the club admin. You will see replies here and by email on your primary account.
        </p>

        <Card className="mb-8 p-4">
          <h2 className="font-semibold text-stone-900 dark:text-white mb-4">New message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              maxLength={200}
            />
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[100px]"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
            </div>
            <HCaptchaWidget
              resetKey={captchaResetKey}
              onVerify={(token) => setHcaptchaToken(token)}
              onExpire={() => setHcaptchaToken(null)}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send feedback'}
            </Button>
          </form>
        </Card>

        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-stone-900 dark:text-white">Your requests</h2>
          {unreadRepliesCount > 0 && <UnreadNotificationIndicator count={unreadRepliesCount} />}
        </div>
        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-stone-500 text-sm">No feedback yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const isUnreadReply =
                unreadRepliesEnabled &&
                item.status === 'answered' &&
                item.admin_response &&
                !item.parent_read_at
              return (
              <Card
                key={item.id}
                className={`p-4 ${isUnreadReply ? 'ring-2 ring-primary/30 dark:ring-primary/40' : ''}`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-medium text-stone-900 dark:text-white flex items-center gap-2">
                    {isUnreadReply && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                        title="New reply from the club"
                        aria-hidden
                      />
                    )}
                    {item.subject}
                  </h3>
                  <Badge variant={item.status === 'open' ? 'warning' : 'default'}>
                    {STATUS_LABEL[item.status] || item.status}
                  </Badge>
                </div>
                <p className="text-sm text-stone-700 dark:text-gray-300 whitespace-pre-wrap">{item.message}</p>
                {item.admin_response && (
                  <div className="mt-4 pt-4 border-t border-stone-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-primary mb-1">Club response</p>
                    <p className="text-sm text-stone-700 dark:text-gray-300 whitespace-pre-wrap">
                      {item.admin_response}
                    </p>
                    {item.responded_at && (
                      <p className="text-xs text-stone-500 mt-2">
                        {new Date(item.responded_at).toLocaleString('en-GB')}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-stone-500 mt-2">
                  Sent {new Date(item.created_at).toLocaleString('en-GB')}
                </p>
              </Card>
            )})}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
