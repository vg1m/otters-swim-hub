import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getPublicOrigin } from '@/lib/utils/public-origin'

function safeInternalPath(nextPath) {
  if (!nextPath || typeof nextPath !== 'string') return null
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return null
  if (nextPath.includes('://')) return null
  return nextPath.length > 1024 ? nextPath.slice(0, 1024) : nextPath
}

function copyCookies(fromResponse, toResponse) {
  for (const c of fromResponse.cookies.getAll()) {
    toResponse.cookies.set(c.name, c.value, c)
  }
}

/**
 * Start Google OAuth on the server so PKCE cookies are set via Set-Cookie on
 * this response. The callback route then reads the same cookies for
 * exchangeCodeForSession (avoids "PKCE code verifier not found" when the
 * client stored the verifier outside cookie storage).
 */
export async function GET(request) {
  const requestUrl = new URL(request.url)
  const origin = getPublicOrigin(request)
  const nextSafe = safeInternalPath(requestUrl.searchParams.get('next'))
  const returnSafe = safeInternalPath(requestUrl.searchParams.get('return')) || '/login'

  const cookieJar = new NextResponse(null, { status: 200 })
  const supabase = createRouteHandlerClient(request, cookieJar)

  const redirectTo = nextSafe
    ? `${origin}/auth/callback?next=${encodeURIComponent(nextSafe)}`
    : `${origin}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error || !data?.url) {
    const errUrl = new URL(returnSafe, origin)
    errUrl.searchParams.set('error', error?.message || 'Could not start Google sign-in')
    return NextResponse.redirect(errUrl)
  }

  const redirect = NextResponse.redirect(data.url)
  copyCookies(cookieJar, redirect)
  return redirect
}
