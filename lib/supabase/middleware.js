import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  const pathname = request.nextUrl.pathname

  // Server-side redirect: intercept ?code= on any page except /auth/callback and /reset-password
  // BEFORE the page renders. auth-js has detectSessionInUrl:true, which makes the browser client
  // auto-exchange any ?code= it sees — but it can't read the httpOnly PKCE verifier cookie set
  // by the server-side OAuth route, so GoTrue returns "invalid flow state".
  // /reset-password is excluded: password reset starts browser-side so its verifier lives in
  // localStorage, which the browser client CAN access.
  if (
    request.nextUrl.searchParams.has('code') &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/oauth/google') &&
    !pathname.startsWith('/reset-password')
  ) {
    const callbackUrl = new URL('/auth/callback', request.nextUrl.origin)
    callbackUrl.search = request.nextUrl.search
    return NextResponse.redirect(callbackUrl)
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
