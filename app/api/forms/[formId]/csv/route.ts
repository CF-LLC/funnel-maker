import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fieldSchema, toCsv } from '@/lib/forms/core'

export const dynamic = 'force-dynamic'

/** Owner-only CSV export (RLS on frm_forms / frm_responses). */
export async function GET(_req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(formId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const db = supabase as any
  const { data: form } = await db.from('frm_forms').select('slug, fields').eq('id', formId).maybeSingle()
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: rows } = await db.from('frm_responses').select('created_at, data').eq('form_id', formId).order('created_at', { ascending: false }).limit(10000)
  const fields = (form.fields || []).map((f: unknown) => fieldSchema.safeParse(f)).filter((r: any) => r.success).map((r: any) => r.data)
  return new NextResponse(toCsv(fields, rows || []), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${form.slug}-responses.csv"`, 'Cache-Control': 'no-store' },
  })
}
