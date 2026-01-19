'use client'
import Link from 'next/link'

export default function Admin() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Dashboard</h2>
      <ul>
        <li><Link href="/admin/pending">Pending Registrations (3)</Link></li>
        <li><Link href="/admin/meets">Manage Meets</Link></li>
        <li><Link href="/admin/sessions">Pool Schedule</Link></li>
        <li><Link href="/admin/billing">Generate Invoices</Link></li>
      </ul>
    </div>
  )
}