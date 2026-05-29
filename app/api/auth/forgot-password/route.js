import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { assertHcaptcha } from '@/lib/hcaptcha/verify-token'

function getResetRedirectUrl() {
  const base =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
      : ''
  return base ? `${base}/reset-password` : undefined
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const captchaError = await assertHcaptcha(request, body)
  if (captchaError) {
    return NextResponse.json({ error: captchaError.error }, { status: captchaError.status })
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const authResponse = NextResponse.json({ ok: true })
  const supabase = createRouteHandlerClient(request, authResponse)

  const redirectTo = getResetRedirectUrl()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    ...(redirectTo ? { redirectTo } : {}),
  })

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to send reset email' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
