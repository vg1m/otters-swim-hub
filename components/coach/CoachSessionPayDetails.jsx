'use client'

import { useMemo, useState, useEffect } from 'react'
import { coachPayEventDisplay } from '@/lib/utils/coach-pay'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const PAY_LIST_INITIAL_PAGE = 12
const PAY_LIST_PAGE = 20

/** Per-session rate explainer + past pay lines (newest first). `layout=embed` adds inner scroll for small containers. */
export default function CoachSessionPayDetails({ perSessionRateKes, payEvents, layout = 'page' }) {
  const [visibleCount, setVisibleCount] = useState(PAY_LIST_INITIAL_PAGE)

  useEffect(() => {
    setVisibleCount(PAY_LIST_INITIAL_PAGE)
  }, [payEvents])

  const payEventsVisible = useMemo(
    () => payEvents.slice(0, visibleCount),
    [payEvents, visibleCount]
  )
  const remaining = Math.max(0, payEvents.length - visibleCount)
  const hasMore = remaining > 0
  const nextBatch = Math.min(PAY_LIST_PAGE, remaining)
  const isEmbed = layout === 'embed'

  const listShell =
    isEmbed
      ? 'min-h-0 max-h-[min(42vh,260px)] sm:max-h-[min(45vh,360px)] overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/40 dark:bg-gray-900/20 [-webkit-overflow-scrolling:touch] shadow-inner'
      : 'rounded-lg border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-900/30 shadow-sm'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Card padding="normal" className="border-slate-200/80 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30">
        {perSessionRateKes != null && Number(perSessionRateKes) > 0 ? (
          <div className="text-sm text-gray-800 dark:text-gray-200 space-y-1.5">
            <p>
              <span className="font-semibold text-blue-600 dark:text-blue-300 tabular-nums text-base sm:text-lg">
                KES{' '}
                {Number(perSessionRateKes).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-gray-600 dark:text-gray-400"> for every training session you coach.</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Your club’s admin set this. If the number is wrong, ask them to update it in Coach Management.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No amount is set yet. If you’re supposed to be paid per session, ask your club’s admin to add it in
            Coach Management. Then it will show on your dashboard and here.
          </p>
        )}
      </Card>

      {payEvents.length === 0 ? (
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>When the club has recorded pay for a session, it will appear in the list below (newest first).</p>
          <p className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-3 border border-gray-100 dark:border-gray-700">
            Nothing here yet. After sessions you coach are finished, lines can appear here once the club has
            recorded them. The amount will usually match your per-session rate above.
          </p>
        </div>
      ) : null}

      {payEvents.length > 0 ? (
        <div className="flex min-h-0 flex-col gap-2 sm:gap-3">
          <div className="flex shrink-0 items-end justify-between gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Past pay lines
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {visibleCount < payEvents.length
                ? `Showing ${Math.min(visibleCount, payEvents.length)} of ${payEvents.length}`
                : `${payEvents.length} total`}
            </p>
          </div>
          <div className={listShell} role="region" aria-label="Session pay list">
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-600">
              {payEventsVisible.map((row) => {
                const d = coachPayEventDisplay(row)
                return (
                  <div key={row.id} className="px-3 py-2.5 sm:px-3.5 bg-white dark:bg-gray-900/60">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Session
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-snug">
                          {d.sessionLine}
                        </p>
                        {d.loc ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{d.loc}</p>
                        ) : null}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          <span className="text-gray-400 dark:text-gray-500">Recorded </span>
                          {d.recorded}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-semibold tabular-nums text-primary self-start">
                        KES {d.amount}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden md:block min-w-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead
                  className={
                    isEmbed
                      ? 'sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]'
                      : 'bg-gray-50 dark:bg-gray-800/90'
                  }
                >
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Recorded
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Session
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Amount (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payEventsVisible.map((row) => {
                    const d = coachPayEventDisplay(row)
                    return (
                      <tr key={row.id} className="bg-white dark:bg-gray-900/80">
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap align-top">
                          {d.recorded}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 align-top">
                          <span className="block leading-snug">{d.sessionLine}</span>
                          {d.loc ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 line-clamp-2">
                              {d.loc}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100 align-top">
                          {d.amount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {hasMore ? (
            <div className="shrink-0">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setVisibleCount((c) => Math.min(c + PAY_LIST_PAGE, payEvents.length))}
              >
                Show {nextBatch} more
                {remaining > nextBatch ? ` (${remaining - nextBatch} after that)` : null}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
