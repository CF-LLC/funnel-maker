import { NextResponse } from 'next/server'
import { z } from 'zod'
import { crmGuard, bad } from '@/lib/crm/guard'
import { CRM_STATUSES, cleanTags, normEmail } from '@/lib/crm/core'

const schema = z.object({
  email: z.string(),
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(200).optional(),
  status: z.enum(CRM_STATUSES).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  follow_up_on: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional(),
})

/** Save the CRM's own fields for a contact (upsert by owner + lowercase email). */
export async function PUT(req: Request) {
  const g = await crmGuard(true); if (g.err) return g.err
  let body: unknown; try { body = await req.json() } catch { return bad('Invalid request.') }
  const p = schema.safeParse(body); if (!p.success) return bad('Please check the fields and try again.')
  const email = normEmail(p.data.email); if (!email) return bad('That email address looks invalid.')
  const row: Record<string, unknown> = { user_id: g.user.id, email, updated_at: new Date().toISOString() }
  for (const k of ['name', 'phone', 'company', 'status'] as const) if (p.data[k] !== undefined) row[k] = p.data[k] || null
  if (row.status === null) delete row.status
  if (p.data.tags !== undefined) row.tags = cleanTags(p.data.tags)
  if (p.data.follow_up_on !== undefined) row.follow_up_on = p.data.follow_up_on || null
  const { data, error } = await g.db.from('crm_contacts').upsert(row, { onConflict: 'user_id,email' }).select().single()
  if (error) return bad('Could not save. Please try again.', 500)
  return NextResponse.json({ contact: data })
}
