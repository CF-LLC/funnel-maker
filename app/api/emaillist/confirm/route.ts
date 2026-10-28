import { NextResponse } from 'next/server'
import { confirmToken } from '@/lib/emaillist/public'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  if (!rateLimit(`el-confirm:${ip}`, 20, 60_000)) return NextResponse.json({ ok: false }, { status: 429 })
  const b = await req.json().catch(() => null)
  return NextResponse.json(await confirmToken(String(b?.token || '')))
}
