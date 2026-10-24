import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { getPublicForm } from '@/lib/forms/public'
import { validateSubmission } from '@/lib/forms/core'

export const dynamic = 'force-dynamic'
const unavailable = () => NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })

// Public form submit: rate limited, Turnstile-checked, validated against the form's fields, stored via service role.
export async function POST(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(`form:${ip}`, 5, 60_000)) return NextResponse.json({ error: 'Too many submissions, try again later' }, { status: 429 })
  if (Number(request.headers.get('content-length') || 0) > 30_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (body.website) return NextResponse.json({ ok: true }, { status: 201 }) // honeypot
  if (typeof body.handle !== 'string' || typeof body.slug !== 'string') return unavailable()
  if (!rateLimit(`form:${ip}:${body.handle}/${body.slug}`, 20, 3_600_000)) return NextResponse.json({ error: 'Too many submissions, try again later' }, { status: 429 })
  if (!(await verifyTurnstile(body.turnstileToken, ip))) return NextResponse.json({ error: 'Bot check failed, please try again' }, { status: 403 })
  const form = await getPublicForm(body.handle, body.slug)
  if (!form) return unavailable()
  const v = validateSubmission(form.fields, body.data)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const { error } = await (serviceClient() as any).from('frm_responses').insert({ form_id: form.id, user_id: '00000000-0000-0000-0000-000000000000', data: v.values })
  if (error) return NextResponse.json({ error: 'Could not save, please try again' }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
