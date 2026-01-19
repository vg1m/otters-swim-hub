'use client'
import { useState } from 'react'

export default function UploadMeet() {
  const [file, setFile] = useState(null)

  const handleUpload = async () => {
    const text = await file.text()
    // Simulate OCR extraction
    alert('Extracted:\nMax events: 7\nFee: KES 3000\nQTs: NONE')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Upload Meet Pack (PDF)</h2>
      <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Extract Data</button>
    </div>
  )
}
