import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { isBot, optedOut, parseBeacon, deviceFromUa } from '@/lib/site-events/core'
import { OWN_HOSTS, recordSiteEvent, visitorHash } from '@/lib/site-events/server'

export const runtime = 'nodejs'

// Cookieless first-party analytics beacon. Stores path, external referrer host, UTM tags, coarse device and a daily-rotating
// hash; never the IP, user agent, email or any id. Honors Do Not Track / GPC and skips bots. Always answers 204.
export async function POST(req: Request) {
  const ok = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  const ip = clientIp(req)
  const ua = req.headers.get('user-agent') || ''
  if (optedOut(req.headers) || isBot(ua)) return ok
  if (!rateLimit(`se:${ip}`, 60, 60_000) || !rateLimit('se-all', 20_000, 3_600_000)) return ok
  const text = await req.text().catch(() => '')
  if (text.length > 4000) return ok
  let body: unknown = null
  try { body = JSON.parse(text) } catch { return ok }
  const row = parseBeacon(body, OWN_HOSTS)
  if (!row) return ok
  await recordSiteEvent({ ...row, device: deviceFromUa(ua), visitor_hash: row.event === 'pageview' ? visitorHash(ip, ua) : null })
  return ok
}
