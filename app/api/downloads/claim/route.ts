import { NextResponse } from 'next/server'
import { claim, findStore } from '@/lib/dlstore/public'
import { clip } from '@/lib/dlstore/core'
import { normEmail } from '@/lib/emaillist/core'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'

export async function POST(req: Request) {
  const ip = clientIp(req)
  const b = await req.json().catch(() => null)
  if (b?.website) return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) // honeypot
  const slug = clip(b?.store, 40).toLowerCase(), product = clip(b?.product, 60).toLowerCase()
  // Access codes are guessable in theory, so claims are tightly rate-limited per IP and per product.
  if (!rateLimit(`dl-claim-ip:${ip}`, 8, 10 * 60_000) || !rateLimit(`dl-claim-p:${slug}/${product}`, 120, 3_600_000)) return NextResponse.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 })
  const email = b?.email ? normEmail(b.email) : null
  if (b?.email && !email) return NextResponse.json({ error: 'Enter a valid email, or leave it empty.' }, { status: 400 })
  const st = await findStore(slug)
  if (!st) return NextResponse.json({ error: 'This store is not available.' }, { status: 404 })
  try {
    const r = await claim(st, product, { key: b?.key, code: b?.code, email })
    return r.ok ? NextResponse.json({ token: r.token, emailed: r.emailed }) : NextResponse.json({ error: r.error }, { status: r.status })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
