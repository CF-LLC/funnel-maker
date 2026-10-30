import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { parseRate } from '@/lib/time/core'

export async function PUT(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const rate = parseRate(b?.default_rate)
  if (rate === undefined) return bad('Enter a rate like 85 or 85.50.')
  const currency = typeof b?.currency === 'string' && /^[A-Z]{3}$/.test(b.currency) ? b.currency : 'USD'
  const { error } = await g.db.from('tt_settings').upsert({ user_id: g.user.id, default_rate_cents: rate, currency, updated_at: new Date().toISOString() })
  if (error) return bad('Could not save settings.')
  return NextResponse.json({ ok: true, settings: { default_rate_cents: rate, currency } })
}
