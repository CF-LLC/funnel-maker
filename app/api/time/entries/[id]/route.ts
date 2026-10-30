import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, cleanText, isDate, isUuid, parseDuration } from '@/lib/time/core'

/** Edit an entry. Billed entries keep their hours, project and billable flag (DB trigger); only date and note can change. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const b = await req.json().catch(() => null)
  const { data: cur } = await g.db.from('tt_entries').select('id, seconds, invoice_id').eq('id', id).maybeSingle()
  if (!cur) return bad('Not found.', 404)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b?.note !== undefined) patch.note = cleanText(b.note, 500)
  if (b?.entry_date !== undefined) { if (!isDate(b.entry_date)) return bad('Pick a date.'); patch.entry_date = b.entry_date }
  const locked = !!cur.invoice_id
  if (b?.duration !== undefined) {
    if (cur.seconds == null) return bad('Stop the timer first.')
    const sec = parseDuration(b.duration); if (sec == null) return bad('Enter a duration like 1:30, 90m or 1.5h.')
    if (sec !== cur.seconds) { if (locked) return bad('This time is on an invoice. Delete that invoice to edit the hours.'); patch.seconds = sec }
  }
  if (b?.project_id !== undefined) { if (!isUuid(b.project_id)) return bad('Pick a project.'); if (locked) return bad('This time is on an invoice.'); patch.project_id = b.project_id }
  if (typeof b?.billable === 'boolean') { if (locked) return bad('This time is on an invoice.'); patch.billable = b.billable }
  const { data, error } = await g.db.from('tt_entries').update(patch).eq('id', id).select(ENTRY_COLS).maybeSingle()
  if (error) return bad(error.code === '42501' ? 'Project not found.' : 'Could not save the entry.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ entry: data })
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const { data: cur } = await g.db.from('tt_entries').select('id, invoice_id').eq('id', id).maybeSingle()
  if (!cur) return bad('Not found.', 404)
  if (cur.invoice_id) return bad('This time is on an invoice. Delete that invoice first, then the entry.')
  const { error } = await g.db.from('tt_entries').delete().eq('id', id)
  if (error) return bad('Could not delete the entry.')
  return NextResponse.json({ ok: true })
}
