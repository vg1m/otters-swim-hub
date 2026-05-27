import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { publishClubAnnouncementFanOut } from '@/lib/announcements/publish-club-announcement'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('club_announcements')
    .select('id, title, body, link_url, published_at, created_at, author_id')
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ announcements: data || [] })
}

export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const announcementBody = typeof body?.body === 'string' ? body.body.trim() : ''
  const linkUrl =
    typeof body?.link_url === 'string' && body.link_url.trim() ? body.link_url.trim() : null

  if (!title || !announcementBody) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { data: recent } = await admin
    .from('club_announcements')
    .select('id')
    .eq('author_id', auth.user.id)
    .gte('published_at', oneMinuteAgo)
    .limit(1)

  if (recent?.length) {
    return NextResponse.json(
      { error: 'Please wait a minute before publishing another announcement' },
      { status: 429 }
    )
  }

  const { data: row, error: insertErr } = await admin
    .from('club_announcements')
    .insert({
      author_id: auth.user.id,
      title,
      body: announcementBody,
      link_url: linkUrl,
    })
    .select('id, title, body, link_url, published_at')
    .single()

  if (insertErr) {
    console.error('club_announcements insert:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const fanOut = await publishClubAnnouncementFanOut(admin, row)

  return NextResponse.json({
    ok: true,
    announcement: row,
    ...fanOut,
  })
}
