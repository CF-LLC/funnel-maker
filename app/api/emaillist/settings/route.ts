import { NextResponse } from 'next/server'
import { elGuard, bad, SETTINGS_COLS } from '@/lib/emaillist/guard'
import { clip, normEmail, validSlug } from '@/lib/emaillist/core'

export async function PUT(req: Request) {
  const g = await elGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!b) return bad('Invalid request.')
  const slug = clip(b.slug, 40).toLowerCase()
  if (slug && !validSlug(slug)) return bad('Page address: 3-40 lowercase letters, numbers or dashes.')
  const reply = b.reply_to ? normEmail(b.reply_to) : null
  if (b.reply_to && !reply) return bad('Reply-to must be a valid email address.')
  const cap = Math.floor(Number(b.daily_cap))
  if (!(cap >= 1 && cap <= 1000)) return bad('Daily limit must be between 1 and 1000.')
  const mailing = clip(b.mailing_address, 300)
  const row = {
    user_id: g.user.id, slug: slug || null, from_name: clip(b.from_name, 80) || null, reply_to: reply, mailing_address: mailing || null,
    page_title: clip(b.page_title, 120) || null, page_blurb: clip(b.page_blurb, 600) || null, double_opt_in: b.double_opt_in !== false,
    daily_cap: cap, sending_enabled: b.sending_enabled === true, updated_at: new Date().toISOString(),
  }
  if (row.sending_enabled && (!row.from_name || !row.mailing_address)) return bad('Add a sender name and mailing address before turning on real sending.')
  const { data, error } = await g.db.from('el_settings').upsert(row, { onConflict: 'user_id' }).select(SETTINGS_COLS).single()
  if (error) return error.code === '23505' ? bad('That page address is taken. Try another.', 409) : bad('Could not save settings.', 500)
  return NextResponse.json({ settings: data })
}
