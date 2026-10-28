import { createServerClient } from '@/lib/supabase'
import { DEFAULT_SETTINGS, type Broadcast, type Settings, type Subscriber } from './core'
import { BROADCAST_COLS, SETTINGS_COLS, SUB_COLS } from './guard'

/** Reads with the signed-in session (owner RLS). */
export async function loadSubscribers(): Promise<Subscriber[]> {
  const db: any = await createServerClient()
  const out: Subscriber[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await db.from('el_subscribers').select(SUB_COLS).order('created_at', { ascending: false }).range(from, from + 999)
    out.push(...(data || [])); if (!data || data.length < 1000) break
  }
  return out
}
export async function loadSettings(): Promise<Settings> {
  const db: any = await createServerClient()
  const { data } = await db.from('el_settings').select(SETTINGS_COLS).maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data || {}) }
}
export async function loadBroadcasts(): Promise<Broadcast[]> {
  const db: any = await createServerClient()
  const { data } = await db.from('el_broadcasts').select(BROADCAST_COLS).order('created_at', { ascending: false }).limit(200)
  return data || []
}
export async function loadBroadcast(id: string): Promise<Broadcast | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db: any = await createServerClient()
  const { data } = await db.from('el_broadcasts').select(BROADCAST_COLS).eq('id', id).maybeSingle()
  return data || null
}
export async function sentLast24h(userId: string): Promise<number> {
  const db: any = await createServerClient()
  const { count } = await db.from('el_sends').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'sent').gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  return count || 0
}
