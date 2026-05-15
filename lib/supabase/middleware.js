import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Skip auth refresh for PKCE OAuth / magic-link exchanges. Middleware runs before Route
 * Handlers; getUser() can churn cookies and invalidate the verifier / flow-state needed
 * for exchangeCodeForSession ("invalid flow state, no valid flow state found").
 */
export function shouldPassthroughOAuthCodeExchange(url) {
  const pathname = url.pathname || ''
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/oauth/google')) {
    return true
  }
  if (!url.searchParams.has('code')) return false
  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset-password')
  )
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  if (shouldPassthroughOAuthCodeExchange(request.nextUrl)) {
    return supabaseResponse
  }

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
