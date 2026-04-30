'use client'

/**
 * Red unread indicator: number pill, or compact dot when showNumber is false.
 */
export function UnreadNotificationIndicator({ count, variant = 'pill' }) {
  if (!count || count < 1) return null

  const label = count > 99 ? '99+' : String(count)

  if (variant === 'dot') {
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
        title={`${count} unread`}
        aria-hidden
      />
    )
  }

  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-gray-900"
      aria-label={`${count} unread notifications`}
    >
      {label}
    </span>
  )
}
