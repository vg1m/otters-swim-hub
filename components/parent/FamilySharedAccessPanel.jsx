'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { MAX_FAMILY_INVITES_PER_BATCH } from '@/lib/family/family-invite-constants'
import HCaptchaWidget from '@/components/auth/HCaptchaWidget'
import { isHcaptchaRequiredOnClient } from '@/lib/hcaptcha/client-config'
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
  const [hcaptchaToken, setHcaptchaToken] = useState(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const captchaRequired = isHcaptchaRequiredOnClient()

  const resetCaptcha = () => {
    setHcaptchaToken(null)
    setCaptchaResetKey((k) => k + 1)
  }

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

    if (captchaRequired && !hcaptchaToken) {
      toast.error('Please complete the security check')
      return
    }

    setBusy(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/family/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invites,
          ...(hcaptchaToken ? { hcaptchaToken } : {}),
        }),
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
          resetCaptcha()
          return
        } else {
          toast.error(data.error || 'Could not send invitations')
        }
        resetCaptcha()
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
      resetCaptcha()
      await onRefresh?.()
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Could not send invitations')
      resetCaptcha()
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
    <details
      id="shared-access"
      className="group bg-white dark:bg-gray-800 rounded-lg shadow-custom border border-gray-200 dark:border-gray-700 transition-colors duration-200"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 text-left outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Shared hub access</h3>
            {familyInvites.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                {familyInvites.length} invited
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-snug">
            Invite a co-parent or partner with their own login to see the same swimmers and invoices.
          </p>
        </div>
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-1 ring-black/5 transition-transform duration-200 group-open:rotate-180 dark:bg-gray-700 dark:text-gray-400 dark:ring-white/10"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>

      <div className="space-y-4 border-t border-gray-200 px-6 pb-6 pt-4 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Up to {MAX_FAMILY_INVITES_PER_BATCH} invites at a time.
        </p>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-3 items-start p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/40"
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
                  className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1 md:mt-6"
                  onClick={() => removeRow(index)}
                  disabled={busy}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <HCaptchaWidget
          resetKey={captchaResetKey}
          onVerify={(token) => setHcaptchaToken(token)}
          onExpire={() => setHcaptchaToken(null)}
        />

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
            disabled={busy || (captchaRequired && !hcaptchaToken)}
          >
            Send invitations
          </Button>
        </div>

        {familyInvites.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            They must sign up or log in with the exact email you enter.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {familyInvites.map((inv) => (
              <li
                key={inv.id}
                className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 sm:p-4 bg-stone-50 dark:bg-gray-800 rounded-lg"
              >
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate col-span-2">
                  {inv.invited_name || inv.invited_email}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate col-span-2">
                  {inv.invited_email}
                </p>
                <p className="text-xs text-gray-500 capitalize self-center">Status: {inv.status}</p>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {inv.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResendFamilyInviteEmail(inv.id)}
                        loading={busy}
                        disabled={busy}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyFamilyInviteInstructions(inv.invited_email)}
                      >
                        Copy
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
    </details>
  )
}
