'use client'
import { useState } from 'react'

export default function Register() {
  const [swimmers, setSwimmers] = useState([{}])

  const addSwimmer = () => setSwimmers([...swimmers, {}])

  const submit = async () => {
    // Simulate MPESA push
    alert('MPESA STK-Push sent for KES 3500. Use PIN 123456.')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Register Multiple Swimmers</h2>
      {swimmers.map((_, i) => (
        <div key={i} style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
          <input placeholder="First Name" />
          <input placeholder="Last Name" />
          <input type="date" placeholder="Date of Birth" />
          <select>
            <option>Competitive</option>
            <option>Learn-to-Swim</option>
            <option>Fitness</option>
          </select>
        </div>
      ))}
      <button onClick={addSwimmer}>+ Add Swimmer</button>
      <button onClick={submit}>Submit & Pay</button>
    </div>
  )
}
