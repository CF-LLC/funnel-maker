import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, cleanText, isDate, isUuid, parseDuration } from '@/lib/time/core'

/** Manual entry: date, duration ("1:30", "90m", "1.5h"), note. */
export async function POST(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.project_id)) return bad('Pick a project.')
  if (!isDate(b?.entry_date)) return bad('Pick a date.')
  const sec = parseDuration(b?.duration)
  if (sec == null) return bad('Enter a duration like 1:30, 90m or 1.5h (1 minute to 24 hours).')
  const { data: p } = await g.db.from('tt_projects').select('id, billable').eq('id', b.project_id).maybeSingle()
  if (!p) return bad('Project not found.', 404)
  const { data, error } = await g.db.from('tt_entries').insert({
    user_id: g.user.id, project_id: p.id, entry_date: b.entry_date, seconds: sec, note: cleanText(b?.note, 500),
    billable: typeof b?.billable === 'boolean' ? b.billable : p.billable,
  }).select(ENTRY_COLS).single()
  if (error) return bad('Could not add the entry.')
  return NextResponse.json({ entry: data })
}
