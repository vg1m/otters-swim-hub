'use client'

import { useRef, useEffect } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import {
  getClientHcaptchaSiteKey,
  isHcaptchaRequiredOnClient,
} from '@/lib/hcaptcha/client-config'

/**
 * hCaptcha for sensitive form submits (auth, feedback, admin publish). OAuth stays outside.
 */
export default function HCaptchaWidget({ onVerify, onExpire, resetKey = 0 }) {
  const ref = useRef(null)
  const sitekey = getClientHcaptchaSiteKey()
  const required = isHcaptchaRequiredOnClient()

  useEffect(() => {
    if (resetKey > 0) {
      ref.current?.resetCaptcha()
    }
  }, [resetKey])

  if (!required || !sitekey) {
    return null
  }

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={ref}
        sitekey={sitekey}
        onVerify={(token) => onVerify?.(token)}
        onExpire={() => onExpire?.()}
        theme="light"
      />
    </div>
  )
}
