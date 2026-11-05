import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { demoTasks } from '@/lib/crm/tasks'
import { loadTasks } from '@/lib/crm/tasks-load'
import { TaskList } from '@/components/crm/task-list'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'crm'))) return null
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const tasks = demo ? demoTasks(today) : await loadTasks(user!.id)
  return <TaskList tasks={tasks} today={today} demo={demo} />
}
