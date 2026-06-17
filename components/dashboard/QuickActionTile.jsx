import Link from 'next/link'
import Card from '@/components/ui/Card'
import { UnreadNotificationIndicator } from '@/components/UnreadNotificationIndicator'

const THEME_CLASSES = {
  amber: {
    card: 'bg-amber-50/90 dark:bg-yellow-900/20 border-amber-200/80 dark:border-yellow-800',
    title: 'text-amber-950 dark:text-yellow-100',
    subtitle: 'text-amber-800/80 dark:text-yellow-300/90',
    icon: 'text-amber-700/75 dark:text-amber-400/80',
  },
  green: {
    card: 'bg-green-50 dark:bg-green-900/20 border-green-200/80 dark:border-green-800',
    title: 'text-green-900 dark:text-green-100',
    subtitle: 'text-green-700/80 dark:text-green-300/90',
    icon: 'text-emerald-600/80 dark:text-emerald-400/85',
  },
  slate: {
    card: 'bg-slate-50 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-700',
    title: 'text-slate-900 dark:text-slate-100',
    subtitle: 'text-slate-600/90 dark:text-slate-400',
    icon: 'text-slate-600/80 dark:text-slate-400/85',
  },
  blue: {
    card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800',
    title: 'text-blue-900 dark:text-blue-100',
    subtitle: 'text-blue-700/80 dark:text-blue-300/90',
    icon: 'text-blue-500/85 dark:text-blue-400/90',
  },
  purple: {
    card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200/80 dark:border-purple-800',
    title: 'text-purple-900 dark:text-purple-100',
    subtitle: 'text-purple-700/80 dark:text-purple-300/90',
    icon: 'text-violet-600/78 dark:text-violet-400/85',
  },
}

/**
 * Compact, color-coded dashboard action tile (admin KPI styling).
 */
export default function QuickActionTile({
  href,
  title,
  subtitle,
  icon,
  theme = 'blue',
  badgeCount = 0,
  ariaLabel,
  className = '',
}) {
  const colors = THEME_CLASSES[theme] || THEME_CLASSES.blue

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`block min-w-0 ${className}`}
    >
      <Card
        padding="none"
        className={`relative shadow-sm hover:shadow-md transition-shadow cursor-pointer ${colors.card}`}
      >
        {badgeCount > 0 && (
          <span className="absolute right-2 top-2 z-10">
            <UnreadNotificationIndicator count={badgeCount} />
          </span>
        )}
        <div className={`flex items-start justify-between gap-2 p-3 ${badgeCount > 0 ? 'pr-8' : 'pr-3'}`}>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold leading-snug ${colors.title}`}>{title}</p>
            {subtitle != null && subtitle !== '' ? (
              <div className={`text-[11px] mt-0.5 leading-snug ${colors.subtitle}`}>{subtitle}</div>
            ) : null}
          </div>
          <div className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
        </div>
      </Card>
    </Link>
  )
}
