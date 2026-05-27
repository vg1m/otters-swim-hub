'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { profileCache } from '@/lib/cache/profile-cache'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ParentAccountContextPanel from '@/components/shared/ParentAccountContextPanel'
import { UnreadNotificationIndicator } from '@/components/UnreadNotificationIndicator'
import { emitNotifierRefresh } from '@/lib/notifications/notifier-refresh'
import toast from 'react-hot-toast'

const STATUS_LABEL = { open: 'Open', answered: 'Answered', closed: 'Closed' }

export default function AdminFeedbackPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [inbox, setInbox] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [parentContext, setParentContext] = useState(null)
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadEnabled, setUnreadEnabled] = useState(true)

  const openCount = useMemo(
    () =>
      unreadEnabled
        ? inbox.filter((item) => item.status === 'open' && !item.admin_read_at).length
        : 0,
    [inbox, unreadEnabled]
  )

  const markFeedbackRead = useCallback(async (feedbackId) => {
    try {
      await fetch('/api/admin/feedback/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackId ? { feedbackId } : {}),
      })
      const now = new Date().toISOString()
      setInbox((prev) =>
        prev.map((item) =>
          item.status === 'open' && (!feedbackId || item.id === feedbackId)
            ? { ...item, admin_read_at: now }
            : item
        )
      )
      emitNotifierRefresh()
    } catch {
      /* non-fatal */
    }
  }, [])

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true)
    try {
      const res = await fetch('/api/admin/feedback')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      const rows = json.feedback || []
      setInbox(rows)
      setUnreadEnabled(json.unreadEnabled !== false)
      const unreadOpen = rows.filter((item) => item.status === 'open' && !item.admin_read_at)
      if (unreadOpen.length > 0) {
        await markFeedbackRead()
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load inbox')
    } finally {
      setLoadingInbox(false)
    }
  }, [markFeedbackRead])

  const loadDetail = useCallback(async (id) => {
    if (!id) return
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setDetail(json.feedback)
      setParentContext(json.parentContext)
      setResponse(json.feedback?.admin_response || '')
    } catch (e) {
      toast.error(e.message || 'Failed to load ticket')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    const cached = user ? profileCache.get(user.id) : null
    if (!authLoading) {
      if (!user || (profile?.role !== 'admin' && cached?.role !== 'admin')) {
        router.push('/login')
        return
      }
      loadInbox()
    }
  }, [user, profile, authLoading, router, loadInbox])

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId)
      markFeedbackRead(selectedId)
    }
  }, [selectedId, loadDetail, markFeedbackRead])

  async function handleRespond(e) {
    e.preventDefault()
    if (!selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/feedback/${selectedId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: response }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Send failed')
      toast.success('Response sent')
      await loadInbox()
      await loadDetail(selectedId)
    } catch (err) {
      toast.error(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Parent feedback</h1>
          {openCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-sm font-medium text-amber-900 dark:text-amber-100">
              {openCount} open {openCount === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-0 overflow-hidden max-h-[70vh] flex flex-col">
            <div className="p-3 border-b border-stone-200 dark:border-gray-700 font-medium text-sm flex items-center justify-between gap-2">
              <span>Inbox</span>
              {openCount > 0 && <UnreadNotificationIndicator count={openCount} />}
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingInbox ? (
                <p className="p-4 text-stone-500 text-sm">Loading…</p>
              ) : inbox.length === 0 ? (
                <p className="p-4 text-stone-500 text-sm">No feedback.</p>
              ) : (
                inbox.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-4 py-3 border-b border-stone-100 dark:border-gray-800 hover:bg-stone-50 dark:hover:bg-gray-800 ${
                      selectedId === item.id ? 'bg-primary/5 dark:bg-primary/10' : ''
                    } ${item.status === 'open' && !item.admin_read_at ? 'border-l-4 border-l-amber-500' : ''}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-sm text-stone-900 dark:text-white truncate flex items-center gap-2">
                        {item.status === 'open' && !item.admin_read_at && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                            title="Needs response"
                            aria-hidden
                          />
                        )}
                        {item.subject}
                      </span>
                      <Badge variant={item.status === 'open' ? 'warning' : 'default'} className="shrink-0 text-xs">
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {!selectedId ? (
              <Card className="p-6 text-stone-500 text-sm">Select a ticket to view and respond.</Card>
            ) : loadingDetail ? (
              <Card className="p-6 text-stone-500">Loading…</Card>
            ) : detail ? (
              <>
                <Card className="p-4">
                  <h2 className="font-semibold text-lg text-stone-900 dark:text-white">{detail.subject}</h2>
                  <p className="text-sm text-stone-500 mb-3">
                    {new Date(detail.created_at).toLocaleString('en-GB')}
                  </p>
                  <p className="text-sm text-stone-700 dark:text-gray-300 whitespace-pre-wrap">{detail.message}</p>

                  <form onSubmit={handleRespond} className="mt-6 space-y-3">
                    <label className="block text-sm font-medium text-stone-700 dark:text-gray-300">
                      Admin response
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[100px]"
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      required
                    />
                    <Button type="submit" disabled={sending || detail.status === 'answered'}>
                      {sending ? 'Sending…' : detail.status === 'answered' ? 'Already answered' : 'Send response'}
                    </Button>
                  </form>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-stone-900 dark:text-white mb-3">Parent account</h3>
                  <ParentAccountContextPanel context={parentContext} showAdminSwimmerLinks />
                </Card>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
