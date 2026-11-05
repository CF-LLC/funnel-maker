// Private manual tasks. Pure helpers only. Not portal checklists and not Today.
export type TaskRow = { id: string; title: string; due_on: string | null; done_at: string | null }
export type TaskLoad = { ok: true; tasks: TaskRow[] } | { ok: false }

/** A query error is a failed load, never an empty list. The error text is not returned. */
export function tasksFromQuery(result: { data?: unknown; error?: unknown } | null | undefined): TaskLoad {
  if (!result || result.error) return { ok: false }
  return { ok: true, tasks: Array.isArray(result.data) ? result.data as TaskRow[] : [] }
}

const TITLE_MAX = 200
export function cleanTitle(v: unknown): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof v !== 'string') return { ok: false, error: 'Add a title.' }
  const title = v.trim()
  if (!title) return { ok: false, error: 'Add a title.' }
  if (title.length > TITLE_MAX) return { ok: false, error: 'The title can be up to 200 characters.' }
  return { ok: true, title }
}

/** Optional calendar day. Empty clears it. Rejects anything that is not a real YYYY-MM-DD date. */
export function cleanDue(v: unknown): { ok: true; due: string | null } | { ok: false; error: string } {
  if (v == null || v === '') return { ok: true, due: null }
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: 'Use a real due date, or leave it blank.' }
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return { ok: false, error: 'Use a real due date, or leave it blank.' }
  return { ok: true, due: v }
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function groupTasks<T extends TaskRow>(rows: T[], today: string): { overdue: T[]; upcoming: T[]; completed: T[] } {
  const open = rows.filter((t) => !t.done_at)
  const byDue = (a: T, b: T) => (a.due_on || '9999-12-31').localeCompare(b.due_on || '9999-12-31')
  return {
    overdue: open.filter((t) => t.due_on && t.due_on < today).sort(byDue),
    upcoming: open.filter((t) => !t.due_on || t.due_on >= today).sort(byDue),
    completed: rows.filter((t) => t.done_at).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')),
  }
}

export function demoTasks(today: string): TaskRow[] {
  return [
    { id: 'demo-overdue', title: 'Send the revised homepage', due_on: addDays(today, -2), done_at: null },
    { id: 'demo-today', title: 'Check the domain renewal', due_on: today, done_at: null },
    { id: 'demo-later', title: 'Draft the next invoice', due_on: addDays(today, 5), done_at: null },
    { id: 'demo-none', title: 'Ask about winter hours', due_on: null, done_at: null },
    { id: 'demo-done', title: 'Welcome note sent', due_on: addDays(today, -10), done_at: new Date().toISOString() },
  ]
}
