import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * Server-side email/password sign-in.
 *
 * Runs signInWithPassword on the server so the resulting auth cookies are
 * emitted as HTTP `Set-Cookie` headers on the response. The browser honors
 * these atomically, which fixes a mobile bug where client-side cookie writes
 * from `document.cookie` could race the subsequent navigation and the proxy
 * would see no auth, bouncing the user back to /login.
 */
function copyCookies(fromResponse, toResponse) {
  for (const c of fromResponse.cookies.getAll()) {
    toResponse.cookies.set(c.name, c.value, c)
  }
}

/** Allow post-login redirect to in-app paths only (no protocol / open redirects). */
function sanitizeRelativeNext(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('/') || s.startsWith('//')) return null
  if (s.includes('://')) return null
  return s.length > 1024 ? s.slice(0, 1024) : s
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const requestedNext = sanitizeRelativeNext(body?.next)

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Placeholder response so Supabase can attach auth cookies during signIn.
  const authResponse = NextResponse.json({ ok: true })
  const supabase = createRouteHandlerClient(request, authResponse)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data?.user) {
    return NextResponse.json(
      { error: error?.message || 'Invalid email or password' },
      { status: 401 }
    )
  }

  let next = '/dashboard'
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.role === 'admin') next = '/admin'
    else if (profile?.role === 'coach') next = '/coach'
    else if (profile?.role === 'parent' && requestedNext) next = requestedNext
  } catch {
    // If the profile lookup fails we still let the user through to /dashboard;
    // the proxy will re-check role on the next request.
  }

  const finalResponse = NextResponse.json({ ok: true, next })
  copyCookies(authResponse, finalResponse)
  return finalResponse
}
