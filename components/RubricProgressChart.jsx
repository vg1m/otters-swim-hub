'use client'

/**
 * Mobile-first progress chart — pure SVG, no chart library.
 * @param {Array<{ monthYear: string, label: string, overallAvg: number|null, coachAttitude: number|null }>} monthlyStats
 * @param {string|null} selectedMonth
 * @param {(monthYear: string) => void} onSelectMonth
 */
export default function RubricProgressChart({ monthlyStats, selectedMonth, onSelectMonth }) {
  if (!monthlyStats?.length || monthlyStats.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Save at least two months of evaluations to see a trend.
        </p>
      </div>
    )
  }

  const chartHeight = 120
  const barWidth = 36
  const gap = 12
  const paddingLeft = 28
  const paddingRight = 12
  const paddingTop = 8
  const paddingBottom = 28
  const plotHeight = chartHeight - paddingTop - paddingBottom
  const totalWidth =
    paddingLeft + paddingRight + monthlyStats.length * barWidth + (monthlyStats.length - 1) * gap

  const maxSkill = 4
  const maxAttitude = 5

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Progress over time</h4>
        <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/80" aria-hidden />
            Skills & habits (avg / 4)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 dark:bg-amber-400" aria-hidden />
            Coach attitude (/ 5)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain px-2 pb-2 -webkit-overflow-scrolling-touch">
        <svg
          width={totalWidth}
          height={chartHeight}
          className="min-w-full touch-manipulation"
          role="img"
          aria-label="Rubric progress over time"
        >
          {/* Y-axis guides for skills scale */}
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
                  className="text-gray-900 dark:text-gray-100"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-gray-400 dark:fill-gray-500 text-[9px]"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {monthlyStats.map((point, i) => {
            const x = paddingLeft + i * (barWidth + gap)
            const centerX = x + barWidth / 2
            const isSelected = selectedMonth && point.monthYear === selectedMonth.slice(0, 10)
            const avg = point.overallAvg
            const barH = avg != null ? (avg / maxSkill) * plotHeight : 0
            const barY = paddingTop + plotHeight - barH

            const att = point.coachAttitude
            const attY =
              att != null
                ? paddingTop + plotHeight * (1 - att / maxAttitude)
                : null

            const prev = i > 0 ? monthlyStats[i - 1] : null
            const prevAttY =
              prev?.coachAttitude != null
                ? paddingTop + plotHeight * (1 - prev.coachAttitude / maxAttitude)
                : null
            const prevCenterX =
              i > 0 ? paddingLeft + (i - 1) * (barWidth + gap) + barWidth / 2 : null

            return (
              <g key={point.monthYear}>
                {attY != null && prevAttY != null && prevCenterX != null && (
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
                {avg != null && (
                  <rect
                    x={x + 4}
                    y={barY}
                    width={barWidth - 8}
                    height={Math.max(barH, 2)}
                    rx={3}
                    fill={isSelected ? 'var(--color-pool-blue)' : 'var(--color-pool-blue-muted)'}
                  />
                )}
                {attY != null && (
                  <circle
                    cx={centerX}
                    cy={attY}
                    r={isSelected ? 5 : 4}
                    className={
                      isSelected
                        ? 'fill-amber-500 stroke-white dark:fill-amber-400 dark:stroke-gray-900'
                        : 'fill-amber-400 stroke-white dark:fill-amber-500/80 dark:stroke-gray-800'
                    }
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={centerX}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[9px] ${isSelected ? 'font-semibold' : 'fill-gray-500 dark:fill-gray-400'}`}
                  fill={isSelected ? 'var(--color-pool-blue)' : undefined}
                >
                  {point.label}
                </text>
                <rect
                  x={x}
                  y={paddingTop}
                  width={barWidth}
                  height={plotHeight + paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectMonth?.(point.monthYear)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectMonth?.(point.monthYear)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${point.label}${avg != null ? `, average ${avg.toFixed(1)}` : ''}`}
                  aria-pressed={isSelected}
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
