import { NextResponse } from 'next/server'
import { clGuard, bad } from '@/lib/changelog/guard'
import { MAX_PROJECTS, PROJECT_COLS, cleanProject } from '@/lib/changelog/core'

/** New project (one private client link each). */
export async function POST(req: Request) {
  const g = await clGuard(true); if (g.err) return g.err
  const c = cleanProject(await req.json().catch(() => null))
  if (!c.ok) return bad(c.error)
  const { count } = await g.db.from('cl_projects').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_PROJECTS) return bad(`Up to ${MAX_PROJECTS} projects.`)
  const { data, error } = await g.db.from('cl_projects').insert({ user_id: g.user.id, ...c.p }).select(PROJECT_COLS).single()
  if (error || !data) return bad('Could not create the project.')
  return NextResponse.json({ project: data })
}
