import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { runWelcome } from '@/lib/welcome/run'

export const dynamic = 'force-dynamic'
// Welcome email trigger (day 0/2/5). Requires CRON_SECRET (unset = always 401). With WELCOME_EMAILS_ENABLED unset it does nothing;
// with it set but WELCOME_EMAILS_DRY_RUN not 'false' it only counts. No schedule is configured.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  const got = req.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const r = await runWelcome()
  return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } })
}
