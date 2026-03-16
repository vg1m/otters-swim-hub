'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

const NOTE_TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'technique', label: 'Technique' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'concern', label: 'Area of Concern' },
]

const defaultForm = {
  title: '',
  note_type: 'general',
  content: '',
  performance_id: '',
  is_private: false,
}

export default function CoachNoteModal({ isOpen, onClose, onSave, editNote = null, performances = [], saving = false }) {
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (editNote) {
        setForm({
          title: editNote.title || '',
          note_type: editNote.note_type || 'general',
          content: editNote.content || '',
          performance_id: editNote.performance_id || '',
          is_private: editNote.is_private || false,
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
    }
  }, [isOpen, editNote])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.content.trim()) errs.content = 'Note content is required'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSave({
      title: form.title.trim(),
      note_type: form.note_type,
      content: form.content.trim(),
      performance_id: form.performance_id || null,
      is_private: form.is_private,
    })
  }

  const performanceOptions = performances.map(p => ({
    value: p.id,
    label: `${p.event} — ${p.time_formatted}${p.competition_date ? ` (${p.competition_date})` : ''}`,
  }))

  const noteTypeColors = {
    general: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    technique: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    fitness: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    achievement: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    concern: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editNote ? 'Edit Coach Note' : 'Add Coach Note'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editNote ? 'Save Changes' : 'Add Note'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Note type selector as visual pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Note Type
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTE_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('note_type', opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                  form.note_type === opt.value
                    ? `${noteTypeColors[opt.value]} border-current`
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Title"
          required
          value={form.title}
          onChange={e => handleChange('title', e.target.value)}
          placeholder="Brief summary of the note"
          error={errors.title}
        />

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            value={form.content}
            onChange={e => handleChange('content', e.target.value)}
            placeholder="Detailed notes on swimmer progress, areas to improve, observations..."
            className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-colors ${
              errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
          )}
        </div>

        {/* Link to performance (optional) */}
        {performances.length > 0 && (
          <Select
            label="Link to Race Time (Optional)"
            value={form.performance_id}
            onChange={e => handleChange('performance_id', e.target.value)}
            options={performanceOptions}
            placeholder="— Not linked to a race —"
            helperText="Attach this note to a specific race time entry"
          />
        )}

        {/* Private toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <input
            type="checkbox"
            checked={form.is_private}
            onChange={e => handleChange('is_private', e.target.checked)}
            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Private note
              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(coach and admin only)</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              When checked, this note will not be visible to the swimmer's parent
            </p>
          </div>
        </label>
      </div>
    </Modal>
  )
}
