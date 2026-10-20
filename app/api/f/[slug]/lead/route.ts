import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateLead } from '@/lib/leads'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export const dynamic = 'force-dynamic'

// Public lead submit for a published funnel. Uses the anon key and the
// fm_submit_lead() function; no service key is needed or used here.
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/i.test(slug)) {
    return NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })
  }

  const ip = clientIp(request)
  if (!rateLimit(`lead:${ip}`, 5, 60_000) || !rateLimit(`lead:${ip}:${slug}`, 20, 3_600_000)) {
    return NextResponse.json({ error: 'Too many submissions, try again later' }, { status: 429 })
  }

  const len = Number(request.headers.get('content-length') || 0)
  if (len > 10_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (!(await verifyTurnstile((body as Record<string, unknown>)?.turnstileToken, ip))) {
    return NextResponse.json({ error: 'Bot check failed, please try again' }, { status: 403 })
  }

  const v = validateLead(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ error: 'Server not configured' }, { status: 503 })

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { lead } = v
  const { error } = await supabase.rpc('fm_submit_lead', {
    p_slug: slug,
    p_name: lead.name,
    p_email: lead.email,
    p_phone: lead.phone,
    p_message: lead.message,
    p_template: lead.template,
    p_utm: lead.utm,
  })

  if (error) {
    if (error.message?.includes('funnel_not_found')) {
      return NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })
    }
    console.error('lead submit failed', error.code)
    return NextResponse.json({ error: 'Could not save lead' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
