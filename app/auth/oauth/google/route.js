import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getPublicOrigin } from '@/lib/utils/public-origin'

/** Post-login redirect when `redirectTo` must not include query params (Supabase allowlist patterns). */
const OAUTH_POST_LOGIN_COOKIE = 'otters_oauth_post_login'

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

  const host = requestUrl.hostname
  const cookieSecure =
    requestUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const isProdHost = !(host === 'localhost' || host.endsWith('.local'))

  if (nextSafe) {
    cookieJar.cookies.set(OAUTH_POST_LOGIN_COOKIE, nextSafe, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure && isProdHost,
      sameSite: 'lax',
      maxAge: 900,
    })
  }

  const supabase = createRouteHandlerClient(request, cookieJar)

  // Bare callback URL matches allowlist entries like `https://domain/auth/callback**`.
  // A `?next=` suffix is often rejected, so Supabase falls back to Site URL and breaks PKCE (same as recovery links).
  const redirectTo = `${origin}/auth/callback`

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
