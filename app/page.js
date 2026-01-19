'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Otters Kenya Swim Club</h1>
      <Link href="/register">Register Swimmers</Link> | 
      <Link href="/admin"> Admin Dashboard</Link>
    </div>
  )
}