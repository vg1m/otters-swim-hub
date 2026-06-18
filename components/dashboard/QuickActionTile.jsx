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
  cyan: {
    card: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200/80 dark:border-cyan-800',
    title: 'text-cyan-950 dark:text-cyan-100',
    subtitle: 'text-cyan-800/80 dark:text-cyan-300/90',
    icon: 'text-cyan-600/80 dark:text-cyan-400/85',
  },
}

function TileInner({ colors, badgeCount, title, subtitle, icon, isActive }) {
  return (
    <Card
      padding="none"
      className={`relative h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer ${colors.card} ${
        isActive ? 'ring-2 ring-primary/60 ring-offset-1 dark:ring-offset-gray-900' : ''
      }`}
    >
      {badgeCount > 0 && (
        <span className="absolute right-2 top-2 z-10">
          <UnreadNotificationIndicator count={badgeCount} />
        </span>
      )}
      <div
        className={`flex h-full min-h-[5.25rem] items-start justify-between gap-3 p-4 sm:p-5 sm:min-h-[5.5rem] ${
          badgeCount > 0 ? 'pr-9' : 'pr-4'
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug min-h-[2.5rem] ${colors.title}`}>{title}</p>
          {subtitle != null && subtitle !== '' ? (
            <div className={`text-xs mt-1 leading-snug ${colors.subtitle}`}>{subtitle}</div>
          ) : null}
        </div>
        <div className={`shrink-0 w-5 h-5 flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

/**
 * Compact, color-coded dashboard action tile (admin KPI styling).
 * Renders a link when href is set, otherwise a button (e.g. toggle panels).
 */
export default function QuickActionTile({
  href,
  onClick,
  title,
  subtitle,
  icon,
  theme = 'blue',
  badgeCount = 0,
  ariaLabel,
  isActive = false,
  className = '',
}) {
  const colors = THEME_CLASSES[theme] || THEME_CLASSES.blue
  const inner = (
    <TileInner
      colors={colors}
      badgeCount={badgeCount}
      title={title}
      subtitle={subtitle}
      icon={icon}
      isActive={isActive}
    />
  )

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={`block h-full min-w-0 ${className}`}>
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isActive}
      className={`block h-full min-w-0 w-full text-left ${className}`}
    >
      {inner}
    </button>
  )
}
