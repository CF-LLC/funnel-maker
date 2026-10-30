import { NextResponse } from 'next/server'
import { exGuard, bad } from '@/lib/expenses/guard'
import { cleanText } from '@/lib/expenses/core'

export async function POST(req: Request) {
  const g = await exGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const name = cleanText(b?.name, 60); if (!name) return bad('Name the category.')
  const { data, error } = await g.db.from('ex_categories').insert({ user_id: g.user.id, name }).select('id, name, archived').single()
  if (error) return bad(error.code === '23505' ? 'You already have that category.' : 'Could not add the category.')
  return NextResponse.json({ category: data })
}
