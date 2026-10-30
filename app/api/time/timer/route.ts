import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, MAX_SECONDS, cleanText, isDate, isUuid, localDate } from '@/lib/time/core'

/** start: one running timer per user (DB unique index); stop: seconds = now - started_at, capped at 24h. */
export async function POST(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (b?.action === 'start') {
    if (!isUuid(b?.project_id)) return bad('Pick a project.')
    const { data: p } = await g.db.from('tt_projects').select('id, billable').eq('id', b.project_id).maybeSingle()
    if (!p) return bad('Project not found.', 404)
    const { data, error } = await g.db.from('tt_entries').insert({
      user_id: g.user.id, project_id: p.id, entry_date: isDate(b?.entry_date) ? b.entry_date : localDate(), started_at: new Date().toISOString(),
      seconds: null, note: cleanText(b?.note, 500), billable: p.billable,
    }).select(ENTRY_COLS).single()
    if (error) return bad(error.code === '23505' ? 'A timer is already running. Stop it first.' : 'Could not start the timer.', error.code === '23505' ? 409 : 400)
    return NextResponse.json({ entry: data })
  }
  if (b?.action === 'stop') {
    const { data: run } = await g.db.from('tt_entries').select('id, started_at').is('seconds', null).maybeSingle()
    if (!run) return bad('No timer is running.', 404)
    const sec = Math.max(0, Math.min(MAX_SECONDS, Math.round((Date.now() - Date.parse(run.started_at)) / 1000)))
    const patch: Record<string, unknown> = { seconds: sec, updated_at: new Date().toISOString() }
    if (b?.note !== undefined) patch.note = cleanText(b.note, 500)
    const { data, error } = await g.db.from('tt_entries').update(patch).eq('id', run.id).is('seconds', null).select(ENTRY_COLS).maybeSingle()
    if (error || !data) return bad('Could not stop the timer.')
    return NextResponse.json({ entry: data, capped: sec === MAX_SECONDS })
  }
  return bad('Unknown action.')
}
