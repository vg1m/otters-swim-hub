'use client'

import Modal from '@/components/ui/Modal'
import AttendanceCalendarView from '@/components/AttendanceCalendarView'

export default function AttendanceCalendarModal({
  isOpen,
  onClose,
  swimmerName,
  attendance = [],
  scheduledSessions = [],
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Attendance calendar: ${swimmerName}`}
      size="xl"
    >
      <AttendanceCalendarView attendance={attendance} scheduledSessions={scheduledSessions} />
    </Modal>
  )
}
