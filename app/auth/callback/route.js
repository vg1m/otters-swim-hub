import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getPublicOrigin } from '@/lib/utils/public-origin'
import { accessTokenIndicatesPasswordRecovery } from '@/lib/utils/jwt-amr'

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

const EMAIL_OTP_TYPES = new Set(['signup', 'invite', 'recovery', 'email', 'magiclink', 'email_change'])

/** Must stay in sync with `app/auth/oauth/google/route.js` */
const OAUTH_POST_LOGIN_COOKIE = 'otters_oauth_post_login'

function clearOttersOAuthReturnCookie(toResponse, requestUrl) {
  const cookieSecure =
    requestUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const host = requestUrl.hostname
  const isProdHost = !(host === 'localhost' || host.endsWith('.local'))
  toResponse.cookies.set(OAUTH_POST_LOGIN_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: cookieSecure && isProdHost,
    sameSite: 'lax',
  })
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')
  const nextParam = requestUrl.searchParams.get('next')
  const nextSafe = safeInternalPath(nextParam)
  const cookieNavNext = safeInternalPath(request.cookies.get(OAUTH_POST_LOGIN_COOKIE)?.value)
  const nextMerged = nextSafe || cookieNavNext
  const origin = getPublicOrigin(request)

  let usedInviteTokenHash = false

  // Placeholder redirect; session cookies attach to this response during exchange
  let response = NextResponse.redirect(new URL('/dashboard', origin))

  const supabase = createRouteHandlerClient(request, response)

  if (token_hash && otpType) {
    if (!EMAIL_OTP_TYPES.has(otpType)) {
      const invalid = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Invalid confirmation link')}`, origin)
      )
      clearOttersOAuthReturnCookie(invalid, requestUrl)
      return invalid
    }
    usedInviteTokenHash = otpType === 'invite'
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    })
    if (error) {
      const errRedirect = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      )
      clearOttersOAuthReturnCookie(errRedirect, requestUrl)
      return errRedirect
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const errRedirect = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      )
      clearOttersOAuthReturnCookie(errRedirect, requestUrl)
      return errRedirect
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginRedirect = NextResponse.redirect(new URL('/login', origin))
    clearOttersOAuthReturnCookie(loginRedirect, requestUrl)
    return loginRedirect
  }

  const isRecoveryVerify = !!(token_hash && otpType === 'recovery')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const isRecoveryJwt =
    !!(
      session?.access_token &&
      accessTokenIndicatesPasswordRecovery(session.access_token, { disallowIfOauthInAmr: true })
    )

  if (isRecoveryVerify || isRecoveryJwt) {
    const res = NextResponse.redirect(new URL('/reset-password', origin))
    copyCookies(response, res)
    clearOttersOAuthReturnCookie(res, requestUrl)
    return res
  }

  if (nextMerged) {
    const res = NextResponse.redirect(new URL(nextMerged, origin))
    copyCookies(response, res)
    clearOttersOAuthReturnCookie(res, requestUrl)
    return res
  }

  if (usedInviteTokenHash && !nextMerged) {
    const res = NextResponse.redirect(new URL('/auth/set-password', origin))
    copyCookies(response, res)
    clearOttersOAuthReturnCookie(res, requestUrl)
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
    clearOttersOAuthReturnCookie(response, requestUrl)
    return response
  }

  const final = NextResponse.redirect(new URL(path, origin))
  copyCookies(response, final)
  clearOttersOAuthReturnCookie(final, requestUrl)
  return final
}
