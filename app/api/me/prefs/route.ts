import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const KEYS = ['weekly_digest', 'new_lead_alerts', 'product_updates'] as const

// Saves the user's own notification preferences (RLS: own row). Saving sends nothing; email is not enabled yet.
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const row: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  for (const k of KEYS) if (typeof b?.[k] === 'boolean') row[k] = b[k]
  const { error } = await (supabase as any).from('user_notification_prefs').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
