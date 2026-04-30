import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function safeInternalPath(nextPath) {
  if (!nextPath || typeof nextPath !== 'string') return null
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return null
  if (nextPath.includes('://')) return null
  return nextPath
}

/**
 * Client-side invite/magic flows often land with access_token + refresh_token in the URL hash
 * (implicit flow). POST them here so the server can persist the session into auth cookies.
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const access_token = typeof body?.access_token === 'string' ? body.access_token : ''
  const refresh_token = typeof body?.refresh_token === 'string' ? body.refresh_token : ''
  const nextSafe = safeInternalPath(body?.next)

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing session tokens' }, { status: 400 })
  }

  const payload = NextResponse.json({
    ok: true,
    next: nextSafe || '/auth/set-password',
  })
  const supabase = createRouteHandlerClient(request, payload)
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    return NextResponse.json({ error: error.message || 'Invalid or expired invite link' }, { status: 401 })
  }

  return payload
}
