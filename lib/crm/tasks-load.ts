import { createServerClient } from '@/lib/supabase'
import { tasksFromQuery, type TaskLoad } from '@/lib/crm/tasks'

const COLS = 'id, title, due_on, done_at, created_at, updated_at'

/** Owner rows only: session client plus an explicit user_id filter. Errors stay a failed load, not an empty list. */
export async function loadTasks(uid: string): Promise<TaskLoad> {
  try {
    const db: any = await createServerClient()
    const loaded = tasksFromQuery(await db.from('crm_tasks').select(COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(500))
    if (!loaded.ok) console.error('[crm-tasks] load failed')
    return loaded
  } catch {
    console.error('[crm-tasks] load failed')
    return { ok: false }
  }
}
