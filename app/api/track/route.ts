import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { VISITOR_COOKIE, freeToolFromPath, parseTrack } from '@/lib/acquisition/core'

// First-party, anonymous page beacon for the admin acquisition funnel. Stores a random visitor id, path, free tool, UTM tags and a "Made with" ref tag only.
export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 })
  if (!rateLimit(`track:${clientIp(req)}`, 30, 60_000)) return ok
  const body = await req.json().catch(() => null)
  const cookieVid = req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]+)`))?.[1]
  const t = parseTrack(body, cookieVid)
  if (!t) return ok
  const tool = t.cta ? null : freeToolFromPath(t.path)
  try {
    await serviceClient().from('acquisition_events').insert({ visitor_id: t.visitorId, kind: t.cta ? 'cta' : tool ? 'free_tool' : 'visit', path: t.path, free_tool: tool, ref: t.ref, utm_source: t.utm_source, utm_medium: t.utm_medium, utm_campaign: t.utm_campaign })
  } catch { /* ignore */ }
  return ok
}
