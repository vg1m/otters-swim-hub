'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { MAX_FAMILY_INVITES_PER_BATCH } from '@/lib/family/family-invite-constants'
import toast from 'react-hot-toast'

function emptyInviteRow() {
  return { email: '', name: '' }
}

export default function FamilySharedAccessPanel({
  familyInvites = [],
  onRefresh,
}) {
  const [rows, setRows] = useState([emptyInviteRow()])
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const addRow = () => {
    if (rows.length >= MAX_FAMILY_INVITES_PER_BATCH) return
    setRows((prev) => [...prev, emptyInviteRow()])
  }

  const removeRow = (index) => {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const sendInviteEmailRequest = async (inviteId) => {
    const res = await fetch('/api/family/invite-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ inviteId }),
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  }

  const handleBatchInvite = async () => {
    const invites = rows
      .map((r) => ({ email: r.email.trim(), name: r.name.trim() || undefined }))
      .filter((r) => r.email)

    if (invites.length === 0) {
      toast.error('Enter at least one email to invite')
      return
    }

    setBusy(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/family/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invites }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          const byEmail = {}
          const nextFieldErrors = {}
          data.errors.forEach((err) => {
            if (err.email) byEmail[err.email.toLowerCase()] = err.message
          })
          rows.forEach((row, index) => {
            const key = row.email.trim().toLowerCase()
            if (key && byEmail[key]) nextFieldErrors[index] = byEmail[key]
          })
          setFieldErrors(nextFieldErrors)
          toast.error(data.errors[0]?.message || 'Could not send invitations')
        } else {
          toast.error(data.error || 'Could not send invitations')
        }
        return
      }

      const created = data.created ?? invites.length
      toast.success(
        created === 1
          ? '1 invitation sent.'
          : `${created} invitations sent.`
      )

      if (data.emailed < created) {
        toast(
          "Some invite emails couldn't be sent automatically. Use Copy message on each pending invite if needed.",
          { duration: 6000 }
        )
      }

      setRows([emptyInviteRow()])
      await onRefresh?.()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Could not send invitations')
    } finally {
      setBusy(false)
    }
  }

  const handleRevokeFamilyInvite = async (row) => {
    if (!row?.id || row.status === 'revoked') return
    setBusy(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { error } = await supabase
        .from('family_account_members')
        .update({ status: 'revoked' })
        .eq('id', row.id)
        .eq('primary_parent_id', user.id)
      if (error) throw error
      toast.success('Access invitation revoked')
      await onRefresh?.()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Could not revoke invitation')
    } finally {
      setBusy(false)
    }
  }

  const handleResendFamilyInviteEmail = async (inviteId) => {
    setBusy(true)
    try {
      const { res, data } = await sendInviteEmailRequest(inviteId)
      if (res.ok && data.sent) {
        toast.success('We emailed them the invite.')
        return
      }
      if (res.ok && data.skipped) {
        toast("We couldn't email them from here. Use Copy message to share and send it yourself.", {
          duration: 6000,
        })
        return
      }
      toast.error(data.error || "We couldn't send the email. Try Copy message to share.")
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Could not send email')
    } finally {
      setBusy(false)
    }
  }

  const copyFamilyInviteInstructions = async (emailAddr) => {
    const text = `You've been invited to share Otters Swim Hub access. Sign in or create an account using ${emailAddr}. After you log in, your shared access links automatically.`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied. Paste it into a message for them.')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <Card
      id="shared-access"
      title="Shared hub access"
      padding="normal"
      subtitle="Invite a co-parent or partner with their own login to see the same swimmers and invoices. Existing accounts link on next login."
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Up to {MAX_FAMILY_INVITES_PER_BATCH} invites at a time.
        </p>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/40"
            >
              <Input
                label={index === 0 ? 'Their name (optional)' : undefined}
                value={row.name}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                placeholder="Jane Doe"
              />
              <div>
                <Input
                  label={index === 0 ? 'Their email' : undefined}
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(index, 'email', e.target.value)}
                  placeholder="jane@example.com"
                  error={fieldErrors[index]}
                />
              </div>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="md:mt-6"
                  onClick={() => removeRow(index)}
                  disabled={busy}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {rows.length < MAX_FAMILY_INVITES_PER_BATCH && (
            <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={busy}>
              Add another person
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleBatchInvite}
            loading={busy}
            disabled={busy}
          >
            Send invitations
          </Button>
        </div>

        {familyInvites.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            They must sign up or log in with the exact email you enter.
          </p>
        ) : (
          <ul className="space-y-3">
            {familyInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-stone-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {inv.invited_name || inv.invited_email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{inv.invited_email}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">Status: {inv.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResendFamilyInviteEmail(inv.id)}
                        loading={busy}
                        disabled={busy}
                      >
                        Email them again
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyFamilyInviteInstructions(inv.invited_email)}
                      >
                        Copy message to share
                      </Button>
                    </>
                  )}
                  {inv.status !== 'revoked' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevokeFamilyInvite(inv)}
                      loading={busy}
                      disabled={busy}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
