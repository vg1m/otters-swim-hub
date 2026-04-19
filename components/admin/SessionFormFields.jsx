'use client'

import { useEffect } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { buildDirectionsUrl } from '@/lib/facilities/directions'

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const RECURRENCE_PATTERN_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly_on_day', label: 'Weekly on specific day' },
  { value: 'monthly_on_week_day', label: 'Monthly on specific week/day' },
  { value: 'monthly_on_first_last', label: 'Monthly on first/last day' },
  { value: 'annually', label: 'Annually on specific date' },
  { value: 'custom', label: 'Custom' },
]

const ORDINAL_OPTIONS = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Fifth' },
]

const CUSTOM_UNIT_OPTIONS = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
]

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Shared form body for Create and Edit Training Session modals.
 *
 * Layout is one column on mobile and two columns from the `sm` breakpoint
 * up (640 px). Rows that need the full width on tablet/desktop use
 * `sm:col-span-2` explicitly.
 */
export default function SessionFormFields({
  sessionForm,
  setSessionForm,
  facilities,
  squadList,
  showCustomPool,
  setShowCustomPool,
  customPoolName,
  setCustomPoolName,
}) {
  const patch = (updates) => setSessionForm((prev) => ({ ...prev, ...updates }))

  const toggleSquad = (id, checked) => {
    setSessionForm((prev) => ({
      ...prev,
      squad_ids: checked
        ? [...prev.squad_ids, id]
        : prev.squad_ids.filter((s) => s !== id),
    }))
  }

  const toggleCustomWeekday = (idx, checked) => {
    setSessionForm((prev) => {
      const days = [...prev.recurrence_custom_weekdays]
      if (checked) {
        if (!days.includes(idx)) days.push(idx)
      } else {
        const at = days.indexOf(idx)
        if (at > -1) days.splice(at, 1)
      }
      return { ...prev, recurrence_custom_weekdays: days }
    })
  }

  const handlePoolChange = (value) => {
    if (value === 'custom') {
      setShowCustomPool(true)
      setCustomPoolName('')
      patch({ facility_id: '', pool_location: '' })
      return
    }
    setShowCustomPool(false)
    setCustomPoolName('')
    const facility = facilities.find((f) => f.id === value)
    patch({ facility_id: value, pool_location: facility?.name || '' })
  }

  // Parse YYYY-MM-DD as a local date so weekday lookups don't drift by a day in
  // negative UTC offsets (e.g. "2026-04-01" => Wed, not Tue).
  const sessionDateWeekday = (() => {
    const s = sessionForm.session_date
    if (!s || typeof s !== 'string') return null
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return null
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    return Number.isNaN(d.getTime()) ? null : d.getDay()
  })()

  const sessionDayOfWeek = sessionDateWeekday != null ? WEEKDAY_NAMES[sessionDateWeekday] : ''

  // When a user turns on Custom + Week and hasn't picked any day yet, seed the
  // picker with the session_date weekday so the start date stays as an
  // occurrence instead of silently getting dropped.
  useEffect(() => {
    if (
      sessionForm.is_recurring &&
      sessionForm.recurrence_type === 'custom' &&
      sessionForm.recurrence_custom_unit === 'week' &&
      Array.isArray(sessionForm.recurrence_custom_weekdays) &&
      sessionForm.recurrence_custom_weekdays.length === 0 &&
      sessionDateWeekday != null
    ) {
      patch({ recurrence_custom_weekdays: [sessionDateWeekday] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionForm.is_recurring,
    sessionForm.recurrence_type,
    sessionForm.recurrence_custom_unit,
    sessionDateWeekday,
  ])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Session Date — own row, full width across both columns so the date
          picker and label never truncate on narrow phones. */}
      <div className="sm:col-span-2">
        <Input
          label="Session Date"
          type="date"
          required
          value={sessionForm.session_date}
          onChange={(e) => patch({ session_date: e.target.value })}
        />
      </div>

      {/* Start + End time pair on its own full-width row with equal columns. */}
      <div className="sm:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
        <Input
          label="Start Time"
          type="time"
          required
          value={sessionForm.start_time}
          onChange={(e) => patch({ start_time: e.target.value })}
        />
        <Input
          label="End Time"
          type="time"
          required
          value={sessionForm.end_time}
          onChange={(e) => patch({ end_time: e.target.value })}
        />
      </div>

      {/* Squads */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Squads <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {squadList.map((squad) => (
            <label key={squad.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={squad.id}
                checked={sessionForm.squad_ids.includes(squad.id)}
                onChange={(e) => toggleSquad(e.target.value, e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{squad.name}</span>
            </label>
          ))}
        </div>
        {squadList.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No active squads. Create squads under Admin &rsaquo; Squads.
          </p>
        )}
      </div>

      {/* Pool Location. Expands to full row when adding a new pool. */}
      <div className={showCustomPool ? 'sm:col-span-2' : ''}>
        <Select
          label="Pool Location"
          required
          value={showCustomPool ? 'custom' : (sessionForm.facility_id || '')}
          onChange={(e) => handlePoolChange(e.target.value)}
          options={[
            ...facilities.map((f) => ({
              value: f.id,
              label: `${f.name} (${f.lanes} lanes, ${f.pool_length}M)`,
            })),
            { value: 'custom', label: '➕ Add New Pool Location' },
          ]}
        />
        {showCustomPool && (
          <div className="mt-4">
            <Input
              label="New Pool Name"
              required
              value={customPoolName}
              onChange={(e) => setCustomPoolName(e.target.value)}
              placeholder="e.g., New Training Center"
              helperText="This pool will be added to your facilities list"
            />
          </div>
        )}
        {(() => {
          if (showCustomPool) return null
          const selected = facilities.find((f) => f.id === sessionForm.facility_id)
          const url = selected ? buildDirectionsUrl(selected) : null
          if (!selected || !url) return null
          return (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selected.name}
                </p>
                {selected.address && (
                  <p className="truncate text-gray-600 dark:text-gray-400">
                    {selected.address}
                  </p>
                )}
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-semibold text-primary hover:underline dark:text-primary-light"
              >
                Open in Maps →
              </a>
            </div>
          )
        })()}
      </div>

      {/* Recurring toggle */}
      <div className="sm:col-span-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sessionForm.is_recurring}
            onChange={(e) => patch({ is_recurring: e.target.checked })}
            className="w-5 h-5 rounded text-primary focus:ring-2 focus:ring-primary"
          />
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">Recurring Session</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This session repeats on a schedule
            </p>
          </div>
        </label>
      </div>

      {sessionForm.is_recurring && (
        <>
          <div className="sm:col-span-2">
            <Select
              label="Recurrence Pattern"
              required={sessionForm.is_recurring}
              value={sessionForm.recurrence_type}
              onChange={(e) => patch({ recurrence_type: e.target.value })}
              options={RECURRENCE_PATTERN_OPTIONS}
            />
          </div>

          {sessionForm.recurrence_type === 'weekly_on_day' && (
            <div className="sm:col-span-2">
              <Select
                label="Day of Week"
                required
                value={sessionForm.recurrence_weekday}
                onChange={(e) => patch({ recurrence_weekday: e.target.value })}
                options={WEEKDAY_OPTIONS}
                helperText={sessionDayOfWeek ? `Session date is ${sessionDayOfWeek}` : ''}
              />
            </div>
          )}

          {sessionForm.recurrence_type === 'monthly_on_week_day' && (
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Week of Month"
                required
                value={sessionForm.recurrence_ordinal}
                onChange={(e) => patch({ recurrence_ordinal: e.target.value })}
                options={ORDINAL_OPTIONS}
              />
              <Select
                label="Day of Week"
                required
                value={sessionForm.recurrence_weekday}
                onChange={(e) => patch({ recurrence_weekday: e.target.value })}
                options={WEEKDAY_OPTIONS}
              />
            </div>
          )}

          {sessionForm.recurrence_type === 'monthly_on_first_last' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day Selection
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="day_type"
                    value="first"
                    checked={sessionForm.recurrence_day_type === 'first'}
                    onChange={(e) => patch({ recurrence_day_type: e.target.value })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    First day of month
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="day_type"
                    value="last"
                    checked={sessionForm.recurrence_day_type === 'last'}
                    onChange={(e) => patch({ recurrence_day_type: e.target.value })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Last day of month
                  </span>
                </label>
              </div>
            </div>
          )}

          {sessionForm.recurrence_type === 'annually' && (
            <div className="sm:col-span-2">
              <Input
                label="Date (Month-Day)"
                type="text"
                required
                value={sessionForm.recurrence_annually_date}
                onChange={(e) => patch({ recurrence_annually_date: e.target.value })}
                placeholder="MM-DD (e.g., 03-12 for March 12)"
                helperText="Format: MM-DD"
              />
            </div>
          )}

          {sessionForm.recurrence_type === 'custom' && (
            <>
              <div className="sm:col-span-2 grid grid-cols-[minmax(5rem,7rem)_1fr] gap-3">
                <Input
                  label="Repeat every"
                  type="number"
                  required
                  min="1"
                  max="99"
                  value={sessionForm.recurrence_custom_interval}
                  onChange={(e) => patch({ recurrence_custom_interval: e.target.value })}
                />
                <Select
                  label="Unit"
                  required
                  value={sessionForm.recurrence_custom_unit}
                  onChange={(e) => patch({ recurrence_custom_unit: e.target.value })}
                  options={CUSTOM_UNIT_OPTIONS}
                />
              </div>

              {sessionForm.recurrence_custom_unit === 'week' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Repeat on days
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_LETTERS.map((letter, idx) => {
                      const selected = sessionForm.recurrence_custom_weekdays.includes(idx)
                      return (
                        <label
                          key={idx}
                          aria-label={WEEKDAY_NAMES[idx]}
                          className={`relative flex flex-col items-center justify-center aspect-square rounded-lg border cursor-pointer select-none transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => toggleCustomWeekday(idx, e.target.checked)}
                            className="sr-only"
                          />
                          {selected && (
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3.5 h-3.5 mb-0.5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span className="text-sm font-medium leading-none">{letter}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Sessions repeat on each selected day inside the interval.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="sm:col-span-2">
            <Input
              label="Recurrence End Date"
              type="date"
              value={sessionForm.recurrence_end_date}
              onChange={(e) => patch({ recurrence_end_date: e.target.value })}
              min={sessionForm.session_date || undefined}
              helperText="Leave blank for indefinite"
            />
          </div>
        </>
      )}
    </div>
  )
}
