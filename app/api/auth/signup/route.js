import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { assertHcaptcha } from '@/lib/hcaptcha/verify-token'
import { validatePassword } from '@/lib/utils/password-validation'

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
  const password = typeof body?.password === 'string' ? body.password : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''

  if (!email || !password || !fullName || !phone) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const validation = validatePassword(password)
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.errors[0] || 'Password does not meet requirements' },
      { status: 400 }
    )
  }

  const authResponse = NextResponse.json({ ok: true })
  const supabase = createRouteHandlerClient(request, authResponse)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phone,
      },
    },
  })

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
