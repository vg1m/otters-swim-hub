import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function copyCookies(fromResponse, toResponse) {
  for (const c of fromResponse.cookies.getAll()) {
    toResponse.cookies.set(c.name, c.value, c)
  }
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  const minLen = Number(process.env.AUTH_PASSWORD_MIN_LENGTH || 8)
  if (password.length < minLen) {
    return NextResponse.json(
      { error: `Password must be at least ${minLen} characters` },
      { status: 400 }
    )
  }

  const authResponse = NextResponse.json({ ok: true })
  const supabase = createRouteHandlerClient(request, authResponse)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in. Open your invite link first.' }, { status: 401 })
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return NextResponse.json({ error: error.message || 'Could not set password' }, { status: 400 })
  }

  let next = '/dashboard'
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role === 'admin') next = '/admin'
    else if (profile?.role === 'coach') next = '/coach'
  } catch {
    //
  }

  const finalResponse = NextResponse.json({ ok: true, next })
  copyCookies(authResponse, finalResponse)
  return finalResponse
}
