import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { publishCoachBroadcastFanOut } from '@/lib/coach/publish-coach-broadcast'

const AUDIENCES = new Set(['parents_in_my_squads', 'coaches'])

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'coach') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  const auth = await requireCoach()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coach_broadcasts')
    .select('id, audience, title, body, link_url, published_at, created_at')
    .eq('coach_id', auth.user.id)
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ broadcasts: data || [] })
}

export async function POST(request) {
  const auth = await requireCoach()
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const audience = typeof body?.audience === 'string' ? body.audience : 'parents_in_my_squads'
  if (!AUDIENCES.has(audience)) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 })
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const broadcastBody = typeof body?.body === 'string' ? body.body.trim() : ''
  const linkUrl =
    typeof body?.link_url === 'string' && body.link_url.trim() ? body.link_url.trim() : null

  if (!title || !broadcastBody) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { data: recent } = await admin
    .from('coach_broadcasts')
    .select('id')
    .eq('coach_id', auth.user.id)
    .gte('published_at', oneMinuteAgo)
    .limit(1)

  if (recent?.length) {
    return NextResponse.json(
      { error: 'Please wait a minute before sending another message' },
      { status: 429 }
    )
  }

  const { data: row, error: insertErr } = await admin
    .from('coach_broadcasts')
    .insert({
      coach_id: auth.user.id,
      audience,
      title,
      body: broadcastBody,
      link_url: linkUrl,
    })
    .select('id, audience, title, body, link_url, published_at')
    .single()

  if (insertErr) {
    console.error('coach_broadcasts insert:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const fanOut = await publishCoachBroadcastFanOut(admin, row, auth.user.id)

  return NextResponse.json({
    ok: true,
    broadcast: row,
    ...fanOut,
  })
}
