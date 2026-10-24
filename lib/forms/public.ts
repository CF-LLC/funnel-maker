import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle } from '@/lib/linkinbio/core'
import { fieldSchema, SLUG_RE, type Field } from '@/lib/forms/core'

export type PublicForm = { id: string; handle: string; slug: string; title: string; description: string; submit_label: string; fields: Field[] }

/** Published form whose owner has forms (or all) access, looked up by the owner's link-in-bio handle. */
export async function getPublicForm(rawHandle: string, rawSlug: string): Promise<PublicForm | null> {
  const handle = normalizeHandle(rawHandle), slug = rawSlug.toLowerCase()
  if (!HANDLE_RE.test(handle) || !SLUG_RE.test(slug)) return null
  const db = serviceClient() as any
  const { data: p } = await db.from('lib_profiles').select('user_id').eq('handle', handle).maybeSingle()
  if (!p) return null
  const { data: f } = await db.from('frm_forms').select('id, slug, title, description, submit_label, fields, published')
    .eq('user_id', p.user_id).eq('slug', slug).maybeSingle()
  if (!f || !f.published) return null
  const { data: ok } = await db.rpc('frm_has_access', { uid: p.user_id })
  if (ok !== true) return null
  const fields = (Array.isArray(f.fields) ? f.fields : []).map((x: unknown) => fieldSchema.safeParse(x)).filter((r: any) => r.success).map((r: any) => r.data)
  return { id: f.id, handle, slug: f.slug, title: f.title, description: f.description, submit_label: f.submit_label, fields }
}
