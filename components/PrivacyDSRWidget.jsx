'use client'

import { useEffect, useRef } from 'react'

export default function PrivacyDSRWidget() {
  const widgetRef = useRef(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double-loading in development mode
    if (scriptLoadedRef.current) return

    // Function to initialize the widget
    const initializeWidget = () => {
      if (window.PrivacyKE && typeof window.PrivacyKE.render === 'function' && widgetRef.current) {
        window.PrivacyKE.render({
          apiKey: 'pk_live_0fd0c18ccff9111cbf8ed9bd08de97a42eb4b070c0103c0c61622b524ea557e3',
          container: '#dsr-widget',
          apiUrl: 'https://hkzthvptitlquhewnomy.supabase.co/functions/v1/api-proxy'
        })
      }
    }

    // Only skip loading if the DSR-specific render method is already available
    if (window.PrivacyKE && typeof window.PrivacyKE.render === 'function') {
      initializeWidget()
      scriptLoadedRef.current = true
      return
    }

    // Load the Privacy.ke DSR widget script
    const script = document.createElement('script')
    script.src = 'https://privacy.ke/widget/dsr-widget.iife.js'
    script.async = true
    
    script.onload = () => {
      initializeWidget()
      scriptLoadedRef.current = true
    }
    
    script.onerror = () => {
      console.error('Failed to load Privacy.ke DSR widget')
    }

    document.body.appendChild(script)

    // Cleanup function
    return () => {
      // Only remove script on unmount, not on re-render
      if (script.parentNode) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="privacy-dsr-widget-wrapper">
      <div id="dsr-widget" ref={widgetRef}></div>
    </div>
  )
}
