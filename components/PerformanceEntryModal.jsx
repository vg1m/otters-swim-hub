'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

const STROKE_OPTIONS = [
  { value: 'freestyle', label: 'Freestyle' },
  { value: 'backstroke', label: 'Backstroke' },
  { value: 'breaststroke', label: 'Breaststroke' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'medley', label: 'Medley (IM)' },
  { value: 'other', label: 'Other' },
]

const DISTANCE_OPTIONS = [
  { value: '25', label: '25m' },
  { value: '50', label: '50m' },
  { value: '100', label: '100m' },
  { value: '200', label: '200m' },
  { value: '400', label: '400m' },
  { value: '800', label: '800m' },
  { value: '1500', label: '1500m' },
]

const defaultForm = {
  event: '',
  stroke: '',
  distance_m: '',
  minutes: '',
  seconds: '',
  centiseconds: '',
  competition_name: '',
  competition_date: '',
  is_personal_best: false,
}

function timeToSeconds(minutes, seconds, centiseconds) {
  const m = parseFloat(minutes) || 0
  const s = parseFloat(seconds) || 0
  const cs = parseFloat(centiseconds) || 0
  return m * 60 + s + cs / 100
}

function formatTime(minutes, seconds, centiseconds) {
  const m = String(parseInt(minutes) || 0)
  const s = String(parseInt(seconds) || 0).padStart(2, '0')
  const cs = String(parseInt(centiseconds) || 0).padStart(2, '0')
  if (parseInt(minutes) > 0) {
    return `${m}:${s}.${cs}`
  }
  return `${s}.${cs}`
}

function parseTimeForEdit(timeSeconds) {
  if (!timeSeconds) return { minutes: '', seconds: '', centiseconds: '' }
  const totalMs = Math.round(timeSeconds * 100)
  const cs = totalMs % 100
  const totalS = Math.floor(totalMs / 100)
  const s = totalS % 60
  const m = Math.floor(totalS / 60)
  return {
    minutes: m > 0 ? String(m) : '',
    seconds: String(s),
    centiseconds: String(cs).padStart(2, '0'),
  }
}

export default function PerformanceEntryModal({ isOpen, onClose, onSave, editRecord = null, saving = false }) {
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        const time = parseTimeForEdit(editRecord.time_seconds)
        setForm({
          event: editRecord.event || '',
          stroke: editRecord.stroke || '',
          distance_m: editRecord.distance_m ? String(editRecord.distance_m) : '',
          minutes: time.minutes,
          seconds: time.seconds,
          centiseconds: time.centiseconds,
          competition_name: editRecord.competition_name || '',
          competition_date: editRecord.competition_date || '',
          is_personal_best: editRecord.is_personal_best || false,
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
    }
  }, [isOpen, editRecord])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.event.trim()) errs.event = 'Event name is required'
    if (!form.seconds && !form.minutes) errs.seconds = 'Time is required'
    const secs = parseFloat(form.seconds) || 0
    if (secs >= 60) errs.seconds = 'Seconds must be less than 60'
    const cs = parseFloat(form.centiseconds) || 0
    if (cs >= 100) errs.centiseconds = 'Must be 00–99'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const time_seconds = timeToSeconds(form.minutes, form.seconds, form.centiseconds)
    const time_formatted = formatTime(form.minutes, form.seconds, form.centiseconds)

    onSave({
      event: form.event.trim(),
      stroke: form.stroke || null,
      distance_m: form.distance_m ? parseInt(form.distance_m) : null,
      time_seconds,
      time_formatted,
      competition_name: form.competition_name.trim() || null,
      competition_date: form.competition_date || null,
      is_personal_best: form.is_personal_best,
    })
  }

  // Auto-build event name from stroke + distance if event is empty
  function handleAutoEvent() {
    if (!form.event && form.stroke && form.distance_m) {
      const strokeLabel = STROKE_OPTIONS.find(o => o.value === form.stroke)?.label || form.stroke
      setForm(prev => ({ ...prev, event: `${form.distance_m}m ${strokeLabel}` }))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editRecord ? 'Edit Race Time' : 'Add Race Time'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editRecord ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Stroke + Distance row */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Stroke"
            value={form.stroke}
            onChange={e => { handleChange('stroke', e.target.value); setTimeout(handleAutoEvent, 0) }}
            options={STROKE_OPTIONS}
            placeholder="Select stroke"
          />
          <Select
            label="Distance"
            value={form.distance_m}
            onChange={e => { handleChange('distance_m', e.target.value); setTimeout(handleAutoEvent, 0) }}
            options={DISTANCE_OPTIONS}
            placeholder="Select distance"
          />
        </div>

        {/* Event name */}
        <Input
          label="Event Name"
          required
          value={form.event}
          onChange={e => handleChange('event', e.target.value)}
          placeholder="e.g. 100m Freestyle, 200m IM"
          error={errors.event}
          helperText="Auto-filled from stroke + distance above, or enter manually"
        />

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Race Time <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                placeholder="mm"
                value={form.minutes}
                onChange={e => handleChange('minutes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">min</p>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-lg font-bold pb-5">:</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                placeholder="ss"
                value={form.seconds}
                onChange={e => handleChange('seconds', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.seconds ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">sec</p>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-lg font-bold pb-5">.</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="99"
                placeholder="cc"
                value={form.centiseconds}
                onChange={e => handleChange('centiseconds', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.centiseconds ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">1/100s</p>
            </div>
          </div>
          {(errors.seconds || errors.centiseconds) && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.seconds || errors.centiseconds}</p>
          )}
        </div>

        {/* Competition */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Competition / Meet Name"
            value={form.competition_name}
            onChange={e => handleChange('competition_name', e.target.value)}
            placeholder="e.g. Regional Championships"
          />
          <Input
            label="Competition Date"
            type="date"
            value={form.competition_date}
            onChange={e => handleChange('competition_date', e.target.value)}
          />
        </div>

        {/* Personal Best */}
        <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <input
            type="checkbox"
            checked={form.is_personal_best}
            onChange={e => handleChange('is_personal_best', e.target.checked)}
            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mark as Personal Best (PB)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Highlights this entry with a PB badge</p>
          </div>
        </label>
      </div>
    </Modal>
  )
}
