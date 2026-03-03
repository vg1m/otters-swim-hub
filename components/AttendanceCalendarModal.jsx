'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export default function AttendanceCalendarModal({ isOpen, onClose, swimmerId, swimmerName, attendance }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getAttendanceStatus = (date) => {
    const record = attendance.find(a => {
      if (!a.training_sessions?.session_date) return false
      return isSameDay(new Date(a.training_sessions.session_date), date)
    })
    
    if (record) return 'attended'
    if (date > new Date()) return 'upcoming'
    if (date < startOfMonth(currentMonth)) return 'other-month'
    return 'none'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'attended':
        return 'bg-green-500 text-white'
      case 'upcoming':
        return 'bg-blue-500 text-white'
      case 'missed':
        return 'bg-red-500 text-white'
      case 'other-month':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-400'
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const today = () => setCurrentMonth(new Date())

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Attendance Calendar - ${swimmerName}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={previousMonth}>
            ← Previous
          </Button>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <Button size="sm" variant="secondary" onClick={today}>
              Today
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={nextMonth}>
            Next →
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Attended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Missed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">No Session</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, idx) => {
            const status = getAttendanceStatus(day)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()

            return (
              <div
                key={idx}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                  transition-all cursor-pointer hover:scale-105
                  ${getStatusColor(status)}
                  ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                `}
                title={`${format(day, 'MMM d, yyyy')}: ${status}`}
              >
                {format(day, 'd')}
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {attendance.filter(a => {
                const sessionDate = new Date(a.training_sessions?.session_date)
                return sessionDate.getMonth() === currentMonth.getMonth() && 
                       sessionDate.getFullYear() === currentMonth.getFullYear()
              }).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sessions Attended</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {Math.round((attendance.filter(a => {
                const sessionDate = new Date(a.training_sessions?.session_date)
                return sessionDate.getMonth() === currentMonth.getMonth()
              }).length / 4) * 100)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {attendance.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
