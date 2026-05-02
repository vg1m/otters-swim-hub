'use client'

import { useEffect, useRef } from 'react'

export default function PrivacyConsentWidget() {
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (scriptLoadedRef.current) return

    const initializeConsent = () => {
      if (window.PrivacyKE && typeof window.PrivacyKE.renderConsent === 'function') {
        window.PrivacyKE.renderConsent({
          apiKey: 'pk_live_0fd0c18ccff9111cbf8ed9bd08de97a42eb4b070c0103c0c61622b524ea557e3',
          apiUrl: 'https://hkzthvptitlquhewnomy.supabase.co/functions/v1/api-proxy',
          layout: 'floating-corner',
          alignment: 'right',
          language: 'en',
          cookiePolicyUrl: 'https://otters.ke/privacy/#:~:text=12.%20Cookies,they%20take%20effect',
          theme: {
            primaryColor: '#0066CC',
            backgroundColor: '#ffffff',
            textColor: '#1A202C',
          },
        })
      }
    }

    if (window.PrivacyKE && typeof window.PrivacyKE.renderConsent === 'function') {
      initializeConsent()
      scriptLoadedRef.current = true
      return
    }

    const script = document.createElement('script')
    script.src = 'https://privacy.ke/widget/consent-widget.iife.js?v=8'
    script.async = true

    script.onload = () => {
      initializeConsent()
      scriptLoadedRef.current = true
    }

    script.onerror = () => {
      console.error('Failed to load Privacy.ke consent widget')
    }

    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return null
}
