import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServerClient } from '@/lib/supabase'
import { serviceClient } from '@/lib/server/admin-client'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'
import { ERR, IMAGE_BUCKET, MAX_IMAGE_BYTES, objectPath, ownedObjectPath, UPLOAD_KINDS, validateImage, type UploadKind } from '@/lib/uploads/image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

/** Auth + demo check. Runs before any body parsing so signed-out requests always get 401. */
async function signedIn() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { err: fail(ERR.auth, 401) }
  if (isDemoUser(user.id)) return { err: fail(ERR.demo, 403) }
  return { user }
}
type SignedInUser = NonNullable<Awaited<ReturnType<typeof signedIn>>['user']>
async function canUse(user: SignedInUser, kind: UploadKind) {
  return hasAccess(user, kind === 'funnel' ? 'funnels' : 'linkinbio')
}

/** POST multipart: file, kind=avatar|funnel, replace=<previous url, optional>. Returns { url }. */
export async function POST(req: Request) {
  const a = await signedIn(); if (a.err) return a.err
  let form: FormData
  try { form = await req.formData() } catch { return fail(ERR.server, 400) }
  const kind = String(form.get('kind') || 'avatar') as UploadKind
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return fail(ERR.server, 400)
  if (!(await canUse(a.user, kind))) return fail(ERR.plan, 403)
  const file = form.get('file')
  if (!(file instanceof Blob)) return fail(ERR.empty, 400)
  if (file.size > MAX_IMAGE_BYTES) return fail(ERR.size, 413)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const v = validateImage(file.type, bytes)
  if (!v.ok) return fail(v.error, 415)
  const path = objectPath(a.user.id, randomUUID(), v.ext)
  const db = serviceClient()
  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: v.mime, cacheControl: '31536000', upsert: false })
  if (error) return fail(ERR.server, 500)
  const url = db.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
  const old = ownedObjectPath(String(form.get('replace') || ''), a.user.id, process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  if (old && old !== path) await db.storage.from(IMAGE_BUCKET).remove([old]).catch(() => null)
  return NextResponse.json({ url })
}

/** DELETE ?url=...&kind=... removes one of the caller's own uploads. */
export async function DELETE(req: Request) {
  const a = await signedIn(); if (a.err) return a.err
  const u = new URL(req.url)
  const kind = (u.searchParams.get('kind') || 'avatar') as UploadKind
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return fail(ERR.server, 400)
  if (!(await canUse(a.user, kind))) return fail(ERR.plan, 403)
  const path = ownedObjectPath(u.searchParams.get('url'), a.user.id, process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  if (path) await serviceClient().storage.from(IMAGE_BUCKET).remove([path]).catch(() => null)
  return NextResponse.json({ ok: true })
}
