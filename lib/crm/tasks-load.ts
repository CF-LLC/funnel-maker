import { createServerClient } from '@/lib/supabase'

const COLS = 'id, title, due_on, done_at, created_at, updated_at'

/** Owner rows only: session client plus an explicit user_id filter. */
export async function loadTasks(uid: string) {
  const db: any = await createServerClient()
  const { data, error } = await db.from('crm_tasks').select(COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(500)
  if (error) return []
  return data || []
}
