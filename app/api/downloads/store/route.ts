import { NextResponse } from 'next/server'
import { dlGuard, bad, STORE_COLS } from '@/lib/dlstore/guard'
import { ACCENTS, clip, validStoreSlug } from '@/lib/dlstore/core'
import { normEmail } from '@/lib/emaillist/core'

export async function PUT(req: Request) {
  const g = await dlGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null); if (!b) return bad('Bad request.')
  const slug = clip(b.slug, 40).toLowerCase() || null
  if (slug && !validStoreSlug(slug)) return bad('Store address: 3–40 lowercase letters, numbers or dashes.')
  const support = b.support_email ? normEmail(b.support_email) : null
  if (b.support_email && !support) return bad('Enter a valid support email.')
  const row = { user_id: g.user.id, slug, title: clip(b.title, 120) || null, blurb: clip(b.blurb, 600) || null,
    accent: (ACCENTS as readonly string[]).includes(b.accent) ? b.accent : '#e50914', support_email: support, email_delivery: b.email_delivery === true, updated_at: new Date().toISOString() }
  const { data, error } = await g.db.from('dl_stores').upsert(row, { onConflict: 'user_id' }).select(STORE_COLS).single()
  if (error) return bad(error.code === '23505' ? 'That store address is taken. Try another.' : 'Could not save.', error.code === '23505' ? 409 : 400)
  return NextResponse.json({ store: data })
}
