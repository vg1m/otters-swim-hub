import { buildSessionDirectionsUrl } from '@/lib/facilities/directions'

/**
 * Google Maps directions link for a training session venue.
 */
export default function SessionDirectionsLink({
  session,
  className = 'text-xs sm:text-sm font-medium text-primary hover:underline inline-block',
  children = 'Get directions →',
}) {
  const url = buildSessionDirectionsUrl(session)
  if (!url) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}
