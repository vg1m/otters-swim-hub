import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function FeatureList({ items }) {
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckIcon />
          </div>
          <span className="text-stone-700 dark:text-gray-300 font-medium leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Parent-hub mock for the season section — matches family dashboard mocks below */
function HubSeasonGraphic() {
  const monthRhythm = [55, 72, 48, 80, 62]
  const attendanceDays = [
    { label: 'Mon', status: 'attended' },
    { label: 'Tue', status: 'attended' },
    { label: 'Wed', status: 'missed' },
    { label: 'Thu', status: 'upcoming' },
    { label: 'Sat', status: 'upcoming' },
  ]
  const statusStyles = {
    attended: 'bg-green-600 text-white',
    missed: 'bg-red-500 text-white',
    upcoming: 'bg-blue-500 text-white',
  }

  return (
    <div
      className="relative w-full max-w-md mx-auto lg:mx-0 min-w-0"
      role="img"
      aria-label="Example parent view: swimmer schedule, attendance, personal best, and fees"
    >
      <div
        className="absolute -inset-3 sm:-inset-6 bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl sm:blur-2xl opacity-80"
        aria-hidden
      />
      <div className="relative bg-stone-900 dark:bg-gray-950 rounded-[1.75rem] p-1.5 sm:p-2 shadow-soft ring-1 ring-white/10 min-w-0">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 space-y-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent dark:from-primary/10 rounded-2xl" aria-hidden />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">AW</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900 dark:text-gray-100 truncate">Amara Wanza</p>
                <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 10 · Dev 3</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary shrink-0 pt-0.5">
              Otters
            </span>
          </div>

          <div className="relative grid grid-cols-3 gap-2 text-center">
            <div className="bg-primary/8 dark:bg-primary/15 rounded-xl py-2.5">
              <p className="text-lg font-bold text-primary tabular-nums">12</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Sessions</p>
            </div>
            <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl py-2.5">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">3</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">PBs</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2.5">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">1</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Invoice</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 bg-stone-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 border border-stone-200/80 dark:border-gray-600/80">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Next at the pool
              </p>
              <p className="text-[11px] font-semibold text-stone-900 dark:text-gray-100 mt-0.5">Mon 16 Mar · 16:00</p>
              <p className="text-[11px] text-primary dark:text-primary truncate">School of Nations Pool</p>
            </div>
          </div>

          <div className="relative">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              This week
            </p>
            <div className="flex gap-1.5">
              {attendanceDays.map((day) => (
                <div key={day.label} className="flex-1 min-w-0 text-center">
                  <div
                    className={`aspect-square max-h-9 rounded-md flex items-center justify-center text-[10px] font-bold ${statusStyles[day.status]}`}
                  >
                    {day.label.charAt(0)}
                  </div>
                  <p className="text-[9px] text-stone-500 dark:text-gray-400 mt-1">{day.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2.5 text-[10px] text-stone-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-green-600" /> Attended
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-500" /> Upcoming
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-red-500" /> Missed
              </span>
            </div>
          </div>

          <div className="relative">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Training rhythm · this month
            </p>
            <div className="flex items-end gap-1 h-12 px-0.5">
              {monthRhythm.map((pct, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t bg-gradient-to-t from-primary to-primary-light/85 dark:from-primary dark:to-primary/85"
                  style={{ height: `${pct}%` }}
                />
              ))}
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-stone-200 dark:border-gray-600 p-3 bg-stone-50/80 dark:bg-gray-900/40 min-w-0">
              <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">Fees</p>
              <p className="text-sm font-bold text-stone-900 dark:text-gray-100 mt-1 leading-tight">Quarter 2 · due soon</p>
              <p className="text-[10px] text-stone-600 dark:text-gray-400 mt-1">M-Pesa · Airtel · card</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-primary/8 dark:bg-primary/15 border border-primary/15 dark:border-primary/25 px-2.5 sm:px-3 py-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                PB
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-stone-900 dark:text-gray-100 leading-snug">100m free · 1:12.45</p>
                <p className="text-[10px] text-stone-500 dark:text-gray-400 mt-0.5">New PB this month</p>
              </div>
              <span className="text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/35 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                1 due
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Performance page mock — rubric progress chart + attendance on one screen */
function ProgressAttendanceGraphic() {
  const attendanceDays = [
    { label: 'Mon', status: 'attended' },
    { label: 'Tue', status: 'attended' },
    { label: 'Wed', status: 'missed' },
    { label: 'Thu', status: 'upcoming' },
    { label: 'Sat', status: 'upcoming' },
  ]
  const statusStyles = {
    attended: 'bg-green-600 text-white',
    missed: 'bg-red-500 text-white',
    upcoming: 'bg-primary text-white',
  }

  const chartMonths = [
    { label: 'Nov', avg: 2.4, attitude: 3.5, selected: false },
    { label: 'Dec', avg: 2.7, attitude: 3.8, selected: false },
    { label: 'Jan', avg: 2.9, attitude: 4.0, selected: false },
    { label: 'Feb', avg: 3.1, attitude: 4.2, selected: false },
    { label: 'Mar', avg: 3.2, attitude: 4.4, selected: true },
  ]

  const milestones = [
    { name: 'Streamline kick', rating: '4', style: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { name: 'Bilateral breathing', rating: '3', style: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { name: 'Punctuality', rating: '3', style: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  ]

  const maxSkill = 4
  const maxAttitude = 5
  const chartHeight = 100
  const barWidth = 28
  const gap = 8
  const paddingLeft = 22
  const paddingRight = 8
  const paddingTop = 6
  const paddingBottom = 22
  const plotHeight = chartHeight - paddingTop - paddingBottom
  const totalWidth =
    paddingLeft + paddingRight + chartMonths.length * barWidth + (chartMonths.length - 1) * gap

  return (
    <div
      className="relative w-full max-w-md mx-auto lg:mx-0 min-w-0"
      role="img"
      aria-label="Example performance view: squad rubric progress over time and weekly attendance"
    >
      <div
        className="absolute -inset-3 sm:-inset-6 bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl sm:blur-2xl opacity-80"
        aria-hidden
      />
      <div className="relative bg-stone-900 dark:bg-gray-950 rounded-[1.75rem] p-1.5 sm:p-2 shadow-soft ring-1 ring-white/10 min-w-0">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 space-y-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent dark:from-primary/10 rounded-2xl" aria-hidden />

          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">AW</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-900 dark:text-gray-100 truncate">Amara Wanza</p>
              <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 10 · Dev 3</p>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-1 bg-stone-100 dark:bg-gray-900/80 p-1 rounded-lg">
            {['Race times', 'Coach notes', 'Attendance', 'Rubric'].map((tab) => (
              <span
                key={tab}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium ${
                  tab === 'Rubric'
                    ? 'font-semibold bg-white dark:bg-gray-700 text-stone-900 dark:text-gray-100 shadow-sm'
                    : 'text-stone-500 dark:text-gray-400'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="relative rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/50 overflow-hidden">
            <div className="px-3 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-stone-900 dark:text-gray-100">Progress over time</p>
              <div className="flex flex-wrap gap-2.5 text-[9px] text-stone-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-primary/80" aria-hidden />
                  Skills & habits
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-amber-500 dark:bg-amber-400" aria-hidden />
                  Coach attitude
                </span>
              </div>
            </div>
            <div className="overflow-x-auto px-1 pb-2">
              <svg width={totalWidth} height={chartHeight} className="min-w-full" aria-hidden>
                {[1, 2, 3, 4].map((tick) => {
                  const y = paddingTop + plotHeight * (1 - tick / maxSkill)
                  return (
                    <g key={tick}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={totalWidth - paddingRight}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.08}
                        className="text-stone-900 dark:text-gray-100"
                      />
                      <text
                        x={paddingLeft - 4}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-stone-400 dark:fill-gray-500 text-[8px]"
                      >
                        {tick}
                      </text>
                    </g>
                  )
                })}
                {chartMonths.map((point, i) => {
                  const x = paddingLeft + i * (barWidth + gap)
                  const centerX = x + barWidth / 2
                  const barH = (point.avg / maxSkill) * plotHeight
                  const barY = paddingTop + plotHeight - barH
                  const attY = paddingTop + plotHeight * (1 - point.attitude / maxAttitude)
                  const prev = i > 0 ? chartMonths[i - 1] : null
                  const prevCenterX = i > 0 ? paddingLeft + (i - 1) * (barWidth + gap) + barWidth / 2 : null
                  const prevAttY = prev
                    ? paddingTop + plotHeight * (1 - prev.attitude / maxAttitude)
                    : null

                  return (
                    <g key={point.label}>
                      {prevAttY != null && prevCenterX != null && (
                        <line
                          x1={prevCenterX}
                          y1={prevAttY}
                          x2={centerX}
                          y2={attY}
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="text-amber-500 dark:text-amber-400"
                          strokeOpacity={0.7}
                        />
                      )}
                      <rect
                        x={x + 3}
                        y={barY}
                        width={barWidth - 6}
                        height={Math.max(barH, 2)}
                        rx={2}
                        fill={point.selected ? 'var(--color-pool-blue)' : 'var(--color-pool-blue-muted)'}
                      />
                      <circle
                        cx={centerX}
                        cy={attY}
                        r={point.selected ? 4.5 : 3.5}
                        className={
                          point.selected
                            ? 'fill-amber-500 stroke-white dark:fill-amber-400 dark:stroke-gray-900'
                            : 'fill-amber-400 stroke-white dark:fill-amber-500/80 dark:stroke-gray-800'
                        }
                        strokeWidth={1.5}
                      />
                      <text
                        x={centerX}
                        y={chartHeight - 5}
                        textAnchor="middle"
                        className={`text-[8px] ${point.selected ? 'font-semibold' : 'fill-stone-500 dark:fill-gray-400'}`}
                        fill={point.selected ? 'var(--color-pool-blue)' : undefined}
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Development 3 · Ages 10–11</p>
              <p className="text-xs font-semibold text-primary dark:text-primary mt-0.5">Overall average: 3.2 / 4</p>
            </div>
            <span className="text-[10px] font-medium border border-stone-200 dark:border-gray-600 rounded-lg px-2.5 py-1 bg-white dark:bg-gray-800 text-stone-700 dark:text-gray-200">
              March
            </span>
          </div>

          <div className="relative space-y-1.5">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-stone-700 dark:text-gray-300 truncate">{m.name}</span>
                <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${m.style}`}>
                  {m.rating}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-stone-500 dark:text-gray-400 pt-0.5">
              Coach attitude: <span className="font-semibold text-amber-600 dark:text-amber-400">4 / 5</span>
            </p>
          </div>

          <div className="relative border-t border-stone-200/80 dark:border-gray-700/80 pt-3">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Attendance · same page
            </p>
            <div className="flex gap-1.5">
              {attendanceDays.map((day) => (
                <div key={day.label} className="flex-1 min-w-0 text-center">
                  <div
                    className={`aspect-square max-h-8 rounded-md flex items-center justify-center text-[10px] font-bold ${statusStyles[day.status]}`}
                  >
                    {day.label.charAt(0)}
                  </div>
                  <p className="text-[9px] text-stone-500 dark:text-gray-400 mt-1">{day.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Family dashboard mock — multi-swimmer hub with rubric snapshot on pathway swimmers */
function FamilyHubGraphic() {
  const amaraChart = [
    { label: 'Nov', avg: 2.4, attitude: 3.5, selected: false },
    { label: 'Dec', avg: 2.7, attitude: 3.8, selected: false },
    { label: 'Jan', avg: 2.9, attitude: 4.0, selected: false },
    { label: 'Feb', avg: 3.1, attitude: 4.2, selected: false },
    { label: 'Mar', avg: 3.2, attitude: 4.4, selected: true },
  ]

  const maxSkill = 4
  const maxAttitude = 5
  const chartHeight = 72
  const barWidth = 22
  const gap = 6
  const paddingLeft = 18
  const paddingRight = 6
  const paddingTop = 4
  const paddingBottom = 16
  const plotHeight = chartHeight - paddingTop - paddingBottom
  const totalWidth = paddingLeft + paddingRight + amaraChart.length * barWidth + (amaraChart.length - 1) * gap

  return (
    <div
      className="relative w-full max-w-md mx-auto lg:mx-0 min-w-0"
      role="img"
      aria-label="Example family dashboard: swimmers, rubric progress, attendance, invoices, and next session"
    >
      <div
        className="absolute -inset-3 sm:-inset-6 bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl sm:blur-2xl opacity-80"
        aria-hidden
      />
      <div className="relative bg-stone-900 dark:bg-gray-950 rounded-[1.75rem] p-1.5 sm:p-2 shadow-soft ring-1 ring-white/10 min-w-0">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 space-y-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent dark:from-primary/10 rounded-2xl" aria-hidden />

          <div className="relative flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-gray-100">My Dashboard</h3>
            <span className="text-[11px] text-stone-400 dark:text-gray-500">Welcome back</span>
          </div>

          <div className="relative grid grid-cols-3 gap-2 text-center">
            <div className="bg-primary/8 dark:bg-primary/15 rounded-xl py-2.5">
              <p className="text-lg font-bold text-primary tabular-nums">2</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Swimmers</p>
            </div>
            <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl py-2.5">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">12</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Sessions</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2.5">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">1</p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">Invoice</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-900/15 px-3 py-2">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">Due</span>
            <p className="text-[11px] text-amber-900 dark:text-amber-100 min-w-0 truncate">
              Quarter 2 training fees · secure checkout ready
            </p>
          </div>

          <div className="relative border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5 bg-stone-50/40 dark:bg-gray-900/20">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">AW</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 dark:text-gray-100 truncate">Amara Wanza</p>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 10 · Dev 3</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                Approved
              </span>
            </div>

            <p className="text-[11px] text-stone-600 dark:text-gray-400">
              3 of 4 scheduled days with attendance (to date)
            </p>

            <div className="rounded-lg border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-2 pt-2 pb-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[10px] font-semibold text-stone-700 dark:text-gray-300">Progress over time</p>
                <p className="text-[9px] text-stone-500 dark:text-gray-400">Rubric · Mar</p>
              </div>
              <div className="overflow-x-auto">
                <svg width={totalWidth} height={chartHeight} className="min-w-full" aria-hidden>
                  {[1, 2, 3, 4].map((tick) => {
                    const y = paddingTop + plotHeight * (1 - tick / maxSkill)
                    return (
                      <line
                        key={tick}
                        x1={paddingLeft}
                        y1={y}
                        x2={totalWidth - paddingRight}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.06}
                        className="text-stone-900 dark:text-gray-100"
                      />
                    )
                  })}
                  {amaraChart.map((point, i) => {
                    const x = paddingLeft + i * (barWidth + gap)
                    const centerX = x + barWidth / 2
                    const barH = (point.avg / maxSkill) * plotHeight
                    const barY = paddingTop + plotHeight - barH
                    const attY = paddingTop + plotHeight * (1 - point.attitude / maxAttitude)
                    const prev = i > 0 ? amaraChart[i - 1] : null
                    const prevCenterX = i > 0 ? paddingLeft + (i - 1) * (barWidth + gap) + barWidth / 2 : null
                    const prevAttY = prev
                      ? paddingTop + plotHeight * (1 - prev.attitude / maxAttitude)
                      : null

                    return (
                      <g key={point.label}>
                        {prevAttY != null && prevCenterX != null && (
                          <line
                            x1={prevCenterX}
                            y1={prevAttY}
                            x2={centerX}
                            y2={attY}
                            stroke="currentColor"
                            strokeWidth={1.25}
                            className="text-amber-500 dark:text-amber-400"
                            strokeOpacity={0.65}
                          />
                        )}
                        <rect
                          x={x + 2}
                          y={barY}
                          width={barWidth - 4}
                          height={Math.max(barH, 2)}
                          rx={2}
                          fill={point.selected ? 'var(--color-pool-blue)' : 'var(--color-pool-blue-muted)'}
                        />
                        <circle
                          cx={centerX}
                          cy={attY}
                          r={point.selected ? 3.5 : 2.5}
                          className="fill-amber-500 dark:fill-amber-400"
                        />
                        <text
                          x={centerX}
                          y={chartHeight - 3}
                          textAnchor="middle"
                          className={`text-[7px] ${point.selected ? 'font-semibold' : 'fill-stone-500 dark:fill-gray-400'}`}
                          fill={point.selected ? 'var(--color-pool-blue)' : undefined}
                        >
                          {point.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="font-semibold text-primary dark:text-primary bg-primary/8 dark:bg-primary/15 px-2 py-0.5 rounded-md">
                Rubric 3.2 / 4
              </span>
              <span className="text-stone-600 dark:text-gray-400 bg-stone-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                Coach attitude 4 / 5
              </span>
            </div>

            <div className="h-8 rounded-lg bg-primary text-white text-[11px] font-semibold flex items-center justify-center">
              Progress and attendance
            </div>
          </div>

          <div className="relative border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">KM</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 dark:text-gray-100 truncate">Kofi Maina</p>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 7 · Pups</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                Approved
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-gray-400">
              2 of 3 scheduled days with attendance (to date)
            </p>
            <div className="flex gap-1.5">
              {['M', 'T', 'W', 'S'].map((day, i) => (
                <div
                  key={day}
                  className={`flex-1 aspect-square max-h-7 rounded-md flex items-center justify-center text-[9px] font-bold ${
                    i === 2 ? 'bg-red-500 text-white' : i === 3 ? 'bg-primary text-white' : 'bg-green-600 text-white'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="h-8 rounded-lg bg-primary text-white text-[11px] font-semibold flex items-center justify-center">
              Progress and attendance
            </div>
          </div>

          <div className="relative flex items-center gap-2 bg-stone-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 border border-stone-200/80 dark:border-gray-600/80">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Next at the pool
              </p>
              <p className="text-[11px] font-semibold text-stone-900 dark:text-gray-100 mt-0.5">Mon 16 Mar · 16:00–17:30</p>
              <p className="text-[11px] text-primary dark:text-primary truncate">School of Nations Pool</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <div className="grain-overlay" aria-hidden />

      <Navigation />

      {/* Hero */}
      <section className="relative bg-stone-50 dark:bg-gray-900 py-20 lg:py-28 overflow-hidden transition-colors duration-200 border-b border-stone-200/60 dark:border-gray-800/80">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-lavender dark:bg-accent-lavender/20 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float-slow" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary dark:text-primary mb-5">
              Since 1987
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest leading-[1.08]">
              Welcome to{' '}
              <span className="text-primary dark:text-primary">Otters Kenya</span>
              {' '}
              <br className="hidden sm:block" />
              <span className="sm:ml-2">Swim Club</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
              Your home for competitive swimming excellence. Register your swimmers, book sessions, track performance,
              and stay connected with our swimming community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-[1.02] transition-transform">
                  Register your swimmers
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-[1.02] transition-transform"
                >
                  Member login
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-600 dark:text-gray-400">
              {['Elite & pathway', 'Learn to swim', 'Fitness swimming'].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary dark:text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: flagship hub (replaces Simple Registration) */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <HubSeasonGraphic />
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                For families
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                One hub for your swimmer&apos;s{' '}
                <span className="text-primary dark:text-primary">season</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                See the training rhythm, follow race times and coach notes, check attendance on the same
                screen, and settle invoices securely without chasing messages across groups.
              </p>
              <FeatureList
                items={[
                  'Upcoming sessions and squad context at a glance',
                  'Progress, coach notes, and attendance calendar together',
                  'Secure online payments for training fees',
                  'Register new swimmers online when you join the club',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Progress + attendance */}
      <section className="py-20 lg:py-28 bg-stone-50 dark:bg-gray-900 relative transition-colors duration-200 border-y border-stone-200/50 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                Clarity
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                Progress and{' '}
                <span className="text-primary dark:text-primary">attendance</span>, together
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                Race times, personal bests, and coach feedback live alongside squad rubric evaluations and
                training attendance so you always know how the season is going.
              </p>
              <FeatureList
                items={[
                  'Race times and PB history in one table',
                  'Squad rubric with progress-over-time chart',
                  'Skills, habits, and coach attitude in one view',
                  'Attendance on the same page as performance, no extra app',
                ]}
              />
            </div>

            <div>
              <ProgressAttendanceGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Family hub */}
      <section className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <FamilyHubGraphic />
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                One login
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                Your family&apos;s{' '}
                <span className="text-primary dark:text-primary">swimming hub</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                From the dashboard, jump into each swimmer&apos;s profile, see rubric progress and attendance at a
                glance, pay what&apos;s due, and see what&apos;s next at the pool without juggling spreadsheets or threads.
              </p>
              <FeatureList
                items={[
                  'All swimmers under your account in one view',
                  'Rubric progress snapshots for pathway squads',
                  'Invoices and secure checkout when fees are due',
                  'One tap into progress, rubric, notes, and attendance',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="relative py-24 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-dark" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/25 dark:bg-primary/20 rounded-full blur-3xl opacity-20 animate-float" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/25 dark:bg-primary/20 rounded-full blur-3xl opacity-20 animate-float-slow" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black border border-white/20 mx-auto mb-8 shadow-lg"
            aria-hidden
          >
            <div className="w-3 h-3 rounded-full bg-primary dark:bg-primary" />
          </div>

          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-5 text-white tracking-tightest leading-tight">
            Join{' '}
            <span className="font-cursive text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white">
              Otters
            </span>{' '}
            Kenya
          </h2>
          <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-xl mx-auto text-white/90">
            Become part of Kenya's premier swim club. Experience professional coaching, competitive opportunities and a supportive swimming community.
          </p>
          <Link href="/register">
            <button
              type="button"
              className="inline-flex items-center justify-center px-10 py-3.5 bg-white text-primary font-bold text-base sm:text-lg rounded-full shadow-lg hover:bg-stone-50 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary mb-10"
            >
              Register your swimmers
            </button>
          </Link>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-white/80">
            {[
              { label: 'Competitive excellence', icon: 'star' },
              { label: 'Secure payments', icon: 'shield' },
              { label: 'Built for families', icon: 'users' },
            ].map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-2">
                {icon === 'star' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                {icon === 'shield' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {icon === 'users' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
    </div>
      </section>

      <Footer />
    </>
  )
}
