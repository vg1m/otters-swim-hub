'use client'

import { useEffect, useState } from 'react'

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Brief white launch screen with Otters logo in installed PWA mode.
 * Complements manifest splash (logo on white) on platforms that still flash the app icon.
 */
export default function PwaLaunchSplash() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isStandalonePwa()) return
    setVisible(true)
    const hide = () => setVisible(false)
    if (document.readyState === 'complete') {
      const t = window.setTimeout(hide, 300)
      return () => window.clearTimeout(t)
    }
    const onLoad = () => {
      window.setTimeout(hide, 300)
    }
    window.addEventListener('load', onLoad, { once: true })
    const fallback = window.setTimeout(hide, 1200)
    return () => {
      window.removeEventListener('load', onLoad)
      window.clearTimeout(fallback)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-white"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/otters-logo.png"
        alt=""
        className="w-[min(78vw,340px)] h-auto max-h-[28vh] object-contain"
        decoding="sync"
        fetchPriority="high"
      />
    </div>
  )
}
