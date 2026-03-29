import { createServerClient } from '@supabase/ssr'

/**
 * Use in Route Handlers only. Sets auth cookies on the outgoing NextResponse
 * (required for exchangeCodeForSession — cookies() from next/headers can fail
 * silently in Route Handlers when using the default server client).
 *
 * @param {import('next/server').NextRequest} request
 * @param {import('next/server').NextResponse} response
 */
export function createRouteHandlerClient(request, response) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
