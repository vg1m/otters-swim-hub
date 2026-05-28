'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const PRESETS = [
  { label: '25 Aug — annual registration', asOf: '2026-08' },
  { label: '25 Sep — monthly + Q1 quarterly', asOf: '2026-09' },
  { label: '25 Dec — Q2 quarterly (+ monthly)', asOf: '2026-12' },
  { label: '25 Mar — Q3 quarterly (+ monthly)', asOf: '2026-03' },
  { label: '25 Jun — Q4 quarterly (+ monthly)', asOf: '2026-06' },
]

export default function BillingSimulatePanel({ onComplete }) {
  const [asOf, setAsOf] = useState('2026-08')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  async function runSimulation(presetAsOf) {
    const value = (presetAsOf ?? asOf).trim()
    if (!value) {
      toast.error('Enter a date (YYYY-MM or YYYY-MM-DD)')
      return
    }

    setLoading(true)
    setLastResult(null)
    try {
      const res = await fetch('/api/admin/billing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ asOf: value }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || res.statusText)
      }
      setLastResult(data)
      toast.success(
        `Simulation done: ${data.registrationCreated ?? 0} reg, ${data.monthlyCreated ?? 0} monthly, ${data.quarterlyCreated ?? 0} quarterly`
      )
      onComplete?.()
    } catch (e) {
      console.error(e)
      toast.error(e?.message || 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding="normal" className="mb-4 md:mb-6 border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30">
      <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
        Billing simulation (dev only)
      </h2>
      <p className="text-sm text-amber-800 dark:text-amber-200/90 mt-1">
        Runs the same job as the 25th cron for a chosen date. Creates real invoices in this database —
        use staging or test swimmers only.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.asOf}
            type="button"
            disabled={loading}
            onClick={() => {
              setAsOf(p.asOf)
              void runSimulation(p.asOf)
            }}
            className="text-xs px-2 py-1 rounded border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="flex-1 text-sm">
          <span className="text-amber-900 dark:text-amber-100 font-medium">As-of date</span>
          <input
            type="text"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            placeholder="2026-08 or 2026-08-25"
            className="mt-1 w-full rounded border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
          <span className="text-xs text-amber-700 dark:text-amber-300/80 block mt-1">
            YYYY-MM uses the 25th of that month (Africa/Nairobi).
          </span>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => runSimulation()}
          className="sm:shrink-0"
        >
          {loading ? 'Running…' : 'Run simulation'}
        </Button>
      </div>

      {lastResult && (
        <pre className="mt-4 text-xs overflow-auto max-h-48 p-3 rounded bg-white/90 dark:bg-gray-900 border border-amber-200 dark:border-amber-800 text-gray-800 dark:text-gray-200">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}
    </Card>
  )
}
