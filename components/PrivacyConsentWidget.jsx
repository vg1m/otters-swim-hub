'use client'

import { useEffect, useRef } from 'react'

// privacy.ke redirects to www.privacy.ke; use canonical URL to avoid CSP/script load failures
const PRIVACY_SCRIPT_SRC = 'https://www.privacy.ke/widget/consent-widget.iife.js?v=13'

let privacyScriptInjected = false

function initializeConsent() {
  if (typeof window === 'undefined') return
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

function loadPrivacyScript() {
  if (typeof document === 'undefined') return
  if (window.PrivacyKE && typeof window.PrivacyKE.renderConsent === 'function') {
    initializeConsent()
    return
  }
  if (privacyScriptInjected) return

  const existing = document.querySelector(`script[src="${PRIVACY_SCRIPT_SRC}"]`)
  if (existing) {
    privacyScriptInjected = true
    if (window.PrivacyKE) initializeConsent()
    return
  }

  privacyScriptInjected = true
  const script = document.createElement('script')
  script.src = PRIVACY_SCRIPT_SRC
  script.async = true
  script.onload = () => initializeConsent()
  script.onerror = () => {
    privacyScriptInjected = false
    console.error('Failed to load Privacy.ke consent widget')
  }
  document.body.appendChild(script)
}

export default function PrivacyConsentWidget() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    loadPrivacyScript()
  }, [])

  return null
}
