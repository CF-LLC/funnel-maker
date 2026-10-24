import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { getReviewOwner } from '@/lib/testimonials/public'
import { isDemoUser } from '@/lib/demo'
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, photoExt, sniffImage, submitSchema } from '@/lib/testimonials/core'

export const dynamic = 'force-dynamic'
const unavailable = () => NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })

// Public review submission: rate limited, Turnstile-checked, stored as pending (private until approved). No emails.
export async function POST(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(`review:${ip}`, 5, 60_000)) return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  if (Number(request.headers.get('content-length') || 0) > PHOTO_MAX_BYTES + 20_000) return NextResponse.json({ error: 'Photo must be 2 MB or smaller' }, { status: 413 })
  let fd: FormData
  try { fd = await request.formData() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const str = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : undefined }
  const v = submitSchema.safeParse({ handle: str('handle') ?? '', name: str('name') ?? '', role: str('role'), rating: str('rating'), body: str('body') ?? '' })
  if (!v.success) return NextResponse.json({ error: v.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
  if (!(await verifyTurnstile(str('turnstileToken'), ip))) return NextResponse.json({ error: 'Bot check failed, please try again' }, { status: 403 })
  const owner = await getReviewOwner(v.data.handle)
  if (!owner) return unavailable()
  if (!owner.accepting) return NextResponse.json({ error: 'This page isn\u2019t taking reviews right now.' }, { status: 409 })

  if (isDemoUser(owner.user_id)) return NextResponse.json({ ok: true, demo: true })
  const db = serviceClient() as any
  let photo_path: string | null = null
  const photo = fd.get('photo')
  if (photo && typeof photo !== 'string' && photo.size > 0) {
    if (photo.size > PHOTO_MAX_BYTES) return NextResponse.json({ error: 'Photo must be 2 MB or smaller' }, { status: 413 })
    const bytes = new Uint8Array(await photo.arrayBuffer())
    const type = sniffImage(bytes)
    if (!type) return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP' }, { status: 415 })
    const path = `${owner.user_id}/${crypto.randomUUID()}.${photoExt(type)}`
    const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: type, upsert: false })
    if (error) return NextResponse.json({ error: 'Could not save the photo, please try again' }, { status: 500 })
    photo_path = path
  }
  const { error } = await db.from('tst_reviews').insert({ user_id: owner.user_id, name: v.data.name, role: v.data.role, rating: v.data.rating, body: v.data.body, photo_path, status: 'pending' })
  if (error) return NextResponse.json({ error: 'Could not save, please try again' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
