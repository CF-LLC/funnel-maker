import { NextResponse } from 'next/server'
import { elGuard, bad } from '@/lib/emaillist/guard'

export async function POST() {
  const g = await elGuard(true); if (g.err) return g.err
  const { data, error } = await g.db.from('el_broadcasts').insert({ user_id: g.user.id, subject: '', body: '' }).select('id').single()
  if (error) return bad('Could not create a draft.', 500)
  return NextResponse.json({ id: data.id })
}
