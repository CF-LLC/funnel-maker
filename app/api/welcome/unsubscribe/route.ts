import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function optOut(t: string | null): Promise<boolean> {
  if (!t || !UUID.test(t)) return false
  try { const { error } = await (serviceClient() as any).from('welcome_email_prefs').update({ opted_out: true, updated_at: new Date().toISOString() }).eq('unsub_token', t); return !error } catch { return false }
}
const page = (ok: boolean) => new NextResponse(`<!doctype html><meta name="robots" content="noindex"><body style="font-family:sans-serif;max-width:480px;margin:60px auto"><p>${ok ? 'Done. You will not get any more SaaS Nation welcome emails.' : 'That link did not work. Reply to any of our emails and we will stop them.'}</p></body>`, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } })

// GET shows a confirm button (link scanners must not unsubscribe people); POST (button or RFC 8058 one-click) opts out.
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') || ''
  if (!UUID.test(t)) return page(false)
  return new NextResponse(`<!doctype html><meta name="robots" content="noindex"><body style="font-family:sans-serif;max-width:480px;margin:60px auto"><form method="post"><p>Stop SaaS Nation welcome emails?</p><button type="submit">Stop these emails</button></form></body>`, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
export async function POST(req: Request) {
  return page(await optOut(new URL(req.url).searchParams.get('t')))
}
