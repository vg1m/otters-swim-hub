/**
 * Custom stroke icons for admin KPI tiles — distinct metaphors (queue, pool,
 * billing, attendance) without default “people blob” / generic calendar fills.
 * Single visual language: 24×24, round caps/joins, no Lucide dependency.
 */
const stroke = {
  width: 1.75,
  cap: 'round',
  join: 'round',
}

function SvgShell({ className, children }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke.width}
      strokeLinecap={stroke.cap}
      strokeLinejoin={stroke.join}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Applications waiting in the tray + “new” cue */
export function KpiPendingIcon({ className }) {
  return (
    <SvgShell className={className}>
      <path d="M8.5 3.5h7a1.25 1.25 0 0 1 1.25 1.25v5.5H7.25V4.75A1.25 1.25 0 0 1 8.5 3.5z" />
      <path d="M9.25 6.75h5.5M9.25 8.75h5.5M9.25 10.75h4" />
      <path d="M4.25 12.25h15.5l-2.15 8.5H6.4l-2.15-8.5z" />
      <path d="M4.25 12.25 7.5 7.75h9l3.25 4.5" />
      <circle cx="18.25" cy="5.25" r="2" fill="currentColor" fillOpacity="0.28" stroke="none" />
    </SvgShell>
  )
}

/** Pool goggles — roster / active members */
export function KpiSwimmersIcon({ className }) {
  return (
    <SvgShell className={className}>
      <circle cx="8.25" cy="12" r="3.35" />
      <circle cx="15.75" cy="12" r="3.35" />
      <path d="M11.6 12h.8" />
      <path d="M2.25 12h2.5M19.25 12h2.5" />
    </SvgShell>
  )
}

/** Invoice / statement — money owed */
export function KpiOutstandingIcon({ className }) {
  return (
    <SvgShell className={className}>
      <path d="M6.5 4.25h8.25L17.75 7.25v12.5a1.25 1.25 0 0 1-1.25 1.25H6.5a1.25 1.25 0 0 1-1.25-1.25V5.5a1.25 1.25 0 0 1 1.25-1.25z" />
      <path d="M14.75 4.5v2.75h2.85" />
      <path d="M9 11.25h6M9 14h6M9 16.75h4" />
      <circle cx="17.25" cy="9.25" r="2" fill="currentColor" fillOpacity="0.22" stroke="none" />
    </SvgShell>
  )
}

/** Squad lanes / group (coach squad assignments) */
export function KpiSquadIcon({ className }) {
  return (
    <SvgShell className={className}>
      <path d="M4.25 6.5h15.5a.75.75 0 0 1 .75.75V17a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75V7.25a.75.75 0 0 1 .75-.75z" />
      <path d="M6.5 10.25H17M6.5 13.5H17" />
    </SvgShell>
  )
}

/** Clipboard + check — sessions marked present */
export function KpiAttendanceIcon({ className }) {
  return (
    <SvgShell className={className}>
      <path d="M9.25 3.25h5.5a1.1 1.1 0 0 1 1.1 1.1V5.5H8.15V4.35a1.1 1.1 0 0 1 1.1-1.1z" />
      <path d="M7.25 5.5h9.5a1.5 1.5 0 0 1 1.5 1.5v12.75a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5V7a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M9.5 10.25h5M9.5 12.75h5M9.5 15.25h3.5" />
      <path d="M9.75 18.6 11.5 20.35 14.75 16.5" />
    </SvgShell>
  )
}

/** Check circle — settled invoices / confirmed payments */
export function KpiPaidIcon({ className }) {
  return (
    <SvgShell className={className}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.15 12.4 10.7 14.95 15.85 9.05" strokeWidth={2} />
    </SvgShell>
  )
}
