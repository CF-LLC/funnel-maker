import { NextResponse } from 'next/server'
import { elGuard, bad } from '@/lib/emaillist/guard'
import { MAX_IMPORT, clip, normEmail, normTags } from '@/lib/emaillist/core'

/** CSV import (parsed in the browser, re-validated here). Existing people, including anyone who unsubscribed, are never changed. */
export async function POST(req: Request) {
  const g = await elGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (b?.attest !== true) return bad('Please confirm everyone on this list agreed to get emails from you.')
  const raw: unknown[] = Array.isArray(b?.rows) ? b.rows : []
  if (!raw.length) return bad('No rows to import.')
  if (raw.length > MAX_IMPORT) return bad(`Up to ${MAX_IMPORT} people per import.`)
  const how = clip(b?.how, 200) || 'CSV import'
  const seen = new Set<string>()
  const rows = raw.flatMap((r: any) => {
    const email = normEmail(r?.email); if (!email || seen.has(email)) return []
    seen.add(email)
    return [{ user_id: g.user.id, email, name: clip(r?.name, 200) || null, tags: normTags(r?.tags), status: 'subscribed', source: 'import', consent: 'owner_attested', consent_detail: how }]
  })
  let added = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await g.db.from('el_subscribers').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,email', ignoreDuplicates: true }).select('id')
    if (error) return bad(`Import stopped after ${added} people. Please try again.`, 500)
    added += data?.length || 0
  }
  return NextResponse.json({ added, alreadyOnList: rows.length - added, invalid: raw.length - rows.length })
}
