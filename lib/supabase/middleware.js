import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const SET_PASSWORD_NEXT = '/auth/set-password'

function redirectAuthCallback(request, extraParams = {}) {
  const callbackUrl = new URL('/auth/callback', request.nextUrl.origin)
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    callbackUrl.searchParams.set(key, value)
  }
  for (const [key, value] of Object.entries(extraParams)) {
    if (value != null && value !== '') callbackUrl.searchParams.set(key, value)
  }
  return NextResponse.redirect(callbackUrl)
}

export async function updateSession(request) {
  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.searchParams
  const tokenHash = search.get('token_hash')
  const otpType = search.get('type')

  // Invite links that land on Site URL (/) with token_hash — forward to server verify + set-password.
  if (
    tokenHash &&
    otpType === 'invite' &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/finish-invite')
  ) {
    return redirectAuthCallback(request, { next: SET_PASSWORD_NEXT })
  }

  // Server-side redirect: intercept ?code= on any page except /auth/callback and /reset-password
  // BEFORE the page renders. auth-js has detectSessionInUrl:true, which makes the browser client
  // auto-exchange any ?code= it sees — but it can't read the httpOnly PKCE verifier cookie set
  // by the server-side OAuth route, so GoTrue returns "invalid flow state".
  // /reset-password is excluded: password reset starts browser-side so its verifier lives in
  // localStorage, which the browser client CAN access.
  if (
    search.has('code') &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/oauth/google') &&
    !pathname.startsWith('/reset-password')
  ) {
    const extra =
      pathname.startsWith('/auth/finish-invite') && !search.has('next')
        ? { next: SET_PASSWORD_NEXT }
        : {}
    return redirectAuthCallback(request, extra)
  }

  // Skip auth refresh entirely on routes that handle their own PKCE exchange.
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/oauth/google')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user is accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Allow coaches to access attendance pages
    const isAttendancePage = request.nextUrl.pathname.includes('/attendance')
    
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    if (profile?.role === 'coach' && !isAttendancePage) {
      return NextResponse.redirect(new URL('/coach', request.url))
    }
  }

  // Check if user is accessing authenticated routes
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/swimmers') ||
    request.nextUrl.pathname.startsWith('/invoices') ||
    request.nextUrl.pathname.startsWith('/check-in') ||
    request.nextUrl.pathname.startsWith('/profile')
  ) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
