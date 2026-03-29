import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function safeInternalPath(nextPath) {
  if (!nextPath || typeof nextPath !== 'string') return null
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return null
  if (nextPath.includes('://')) return null
  return nextPath
}

function copyCookies(fromResponse, toResponse) {
  for (const c of fromResponse.cookies.getAll()) {
    toResponse.cookies.set(c.name, c.value, c)
  }
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const nextSafe = safeInternalPath(nextParam)
  const origin = requestUrl.origin

  // Placeholder redirect; session cookies attach to this response during exchange
  let response = NextResponse.redirect(new URL('/dashboard', origin))

  const supabase = createRouteHandlerClient(request, response)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      )
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  if (nextSafe) {
    const res = NextResponse.redirect(new URL(nextSafe, origin))
    copyCookies(response, res)
    return res
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  let role = profile?.role
  if (!role) {
    await new Promise((r) => setTimeout(r, 150))
    const { data: retry } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = retry?.role
  }

  let path = '/dashboard'
  if (role === 'admin') path = '/admin'
  else if (role === 'coach') path = '/coach'

  if (path === '/dashboard') {
    return response
  }

  const final = NextResponse.redirect(new URL(path, origin))
  copyCookies(response, final)
  return final
}
