'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ParentAccountContextPanel from '@/components/shared/ParentAccountContextPanel'
import toast from 'react-hot-toast'

export default function CoachSwimmerContacts({ swimmerId }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState(null)

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/swimmers/${swimmerId}/parent-context`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setContext(json.parentContext)
      setOpen(true)
    } catch (e) {
      toast.error(e.message || 'Could not load contacts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="secondary" fullWidth onClick={toggle} disabled={loading}>
        {loading ? 'Loading…' : open ? 'Hide family & contacts' : 'Family & contacts'}
      </Button>
      {open && context && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-left">
          <ParentAccountContextPanel context={context} />
        </div>
      )}
    </div>
  )
}
