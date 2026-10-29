import { NextResponse } from 'next/server'
import { clGuard, bad } from '@/lib/changelog/guard'
import { MAX_REQUESTS, REQ_COLS, cleanRequest, isUuid } from '@/lib/changelog/core'

/** Add a request to a project. It always starts as "waiting" (the DB enforces this too). */
export async function POST(req: Request) {
  const g = await clGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.project_id)) return bad('Not found.', 404)
  const c = cleanRequest(b); if (!c.ok) return bad(c.error)
  const { count } = await g.db.from('cl_requests').select('id', { count: 'exact', head: true }).eq('project_id', b.project_id)
  if ((count || 0) >= MAX_REQUESTS) return bad(`Up to ${MAX_REQUESTS} requests per project.`)
  const { data, error } = await g.db.from('cl_requests').insert({ user_id: g.user.id, project_id: b.project_id, ...c.r }).select(REQ_COLS).single()
  if (error || !data) return bad('Could not add the request.')
  return NextResponse.json({ request: data })
}
