import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { cleanText, isUuid, parseRate } from '@/lib/time/core'

const PROJECT_COLS = 'id, client_id, name, hourly_rate_cents, billable, archived'
export async function POST(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const name = cleanText(b?.name, 120)
  if (!isUuid(b?.client_id)) return bad('Pick a client.')
  if (!name) return bad('Give the project a name.')
  const rate = parseRate(b?.hourly_rate)
  if (rate === undefined) return bad('Enter a rate like 85 or 85.50, or leave it empty to use your default.')
  const { data, error } = await g.db.from('tt_projects').insert({ user_id: g.user.id, client_id: b.client_id, name, hourly_rate_cents: rate, billable: b?.billable !== false }).select(PROJECT_COLS).single()
  if (error) return bad(error.code === '42501' ? 'Client not found.' : 'Could not add the project.')
  return NextResponse.json({ project: data })
}
