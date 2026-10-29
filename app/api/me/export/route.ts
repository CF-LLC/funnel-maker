import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { EXPORT_TABLES } from '@/lib/me/results'

// "Download my data": the signed-in user's own rows as JSON, read with their own session so RLS limits it to their data.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (!rateLimit(`export:${user.id}`, 3, 60_000)) return NextResponse.json({ error: 'Please wait a minute and try again.' }, { status: 429 })
  const db = supabase as any
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email, created_at: user.created_at } }
  for (const t of EXPORT_TABLES) {
    const { data, error } = await db.from(t.table).select('*').eq(t.col, user.id).limit(10000)
    out[t.table] = error ? { error: 'not available' } : data
  }
  const fids = Array.isArray(out.funnels) ? (out.funnels as any[]).map((f) => f.id) : []
  if (fids.length) {
    const { data } = await db.from('fm_leads').select('*').in('funnel_id', fids).limit(20000)
    out.fm_leads = data ?? []
  }
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="saasnation-my-data-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' } })
}
