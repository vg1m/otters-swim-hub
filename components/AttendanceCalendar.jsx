'use client'

import { format } from 'date-fns'

export default function AttendanceCalendar({ swimmerId, attendance }) {
  // Generate last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - i))
    return date
  })
  
  const getAttendanceStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Check if there's an attendance record for this date
    const record = attendance.find(a => {
      if (!a.training_sessions?.session_date) return false
      const sessionDateStr = format(new Date(a.training_sessions.session_date), 'yyyy-MM-dd')
      return sessionDateStr === dateStr
    })
    
    if (record) return 'attended'
    if (date > new Date()) return 'upcoming'
    return 'none'
  }
  
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Recent Attendance:</p>
      <div className="flex gap-1 flex-wrap">
        {days.map((day, i) => {
          const status = getAttendanceStatus(day)
          const colors = {
            attended: 'bg-green-500',
            upcoming: 'bg-blue-500',
            missed: 'bg-red-500',
            none: 'bg-gray-200 dark:bg-gray-700'
          }
          
          return (
            <div
              key={i}
              className={`w-6 h-6 rounded ${colors[status]} transition-all hover:scale-110`}
              title={`${format(day, 'MMM d')}: ${status}`}
            />
          )
        })}
      </div>
    </div>
  )
}
