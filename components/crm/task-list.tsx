'use client'
import { useState } from 'react'
import { Check, Plus, RotateCcw } from 'lucide-react'
import { groupTasks, type TaskRow } from '@/lib/crm/tasks'

const DEMO_MSG = 'This is the demo account, so changes are not saved.'

async function call(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
  return j
}

export function TaskList({ tasks: initial, today, demo }: { tasks: TaskRow[]; today: string; demo: boolean }) {
  const [tasks, setTasks] = useState(initial)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; title: string; due: string } | null>(null)
  const groups = groupTasks(tasks, today)
  const empty = tasks.length === 0

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg('')
    if (demo) return setMsg(DEMO_MSG)
    setBusy(true)
    try {
      const { task } = await call('/api/crm/tasks', 'POST', { title, due_on: due })
      setTasks([task, ...tasks]); setTitle(''); setDue('')
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }
  async function saveEdit() {
    if (!editing) return; setMsg('')
    if (demo) return setMsg(DEMO_MSG)
    setBusy(true)
    try {
      const { task } = await call(`/api/crm/tasks/${editing.id}`, 'PATCH', { title: editing.title, due_on: editing.due })
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))); setEditing(null)
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }
  async function mark(id: string, done: boolean) {
    setMsg('')
    if (demo) return setMsg(DEMO_MSG)
    setBusy(true)
    try {
      const { task } = await call(`/api/crm/tasks/${id}/done`, 'POST', { done })
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)))
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }

  const row = (t: TaskRow, mode: 'open' | 'done') => (
    <li key={t.id} className="flex flex-col gap-2 border-t border-white/10 py-3 sm:flex-row sm:items-center" data-task={t.id}>
      {editing?.id === t.id ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <input aria-label="Task title" value={editing.title} maxLength={200} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="cine-input min-h-[44px] flex-1 !py-2 !text-sm" />
          <input aria-label="Due date" type="date" value={editing.due} onChange={(e) => setEditing({ ...editing, due: e.target.value })} className="cine-input min-h-[44px] sm:w-44 !py-2 !text-sm [color-scheme:dark]" />
          <button type="button" disabled={busy} onClick={saveEdit} className="min-h-[44px] rounded-full bg-white px-4 text-sm font-semibold text-black disabled:opacity-60">Save</button>
          <button type="button" onClick={() => setEditing(null)} className="min-h-[44px] rounded-full px-4 text-sm text-zinc-300 ring-1 ring-white/15">Cancel</button>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${mode === 'done' ? 'text-zinc-400 line-through' : ''}`}>{t.title}</p>
            <p className="text-xs text-zinc-400">{t.due_on ? `Due ${t.due_on}` : 'No due date'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'open' && <button type="button" disabled={busy} onClick={() => setEditing({ id: t.id, title: t.title, due: t.due_on || '' })} className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-zinc-200 ring-1 ring-white/15">Edit</button>}
            <button type="button" disabled={busy} onClick={() => mark(t.id, mode === 'open')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-black disabled:opacity-60">
              {mode === 'open' ? <><Check className="h-4 w-4" />Done</> : <><RotateCcw className="h-4 w-4" />Reopen</>}
            </button>
          </div>
        </>
      )}
    </li>
  )
  const section = (key: string, label: string, rows: TaskRow[], mode: 'open' | 'done', hint: string) => (
    <section data-task-section={key} className="cine-glass rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">{label}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : <ul className="mt-1">{rows.map((t) => row(t, mode))}</ul>}
    </section>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-400">Private follow-ups. A title, and a due date if you want one. Nothing here is emailed.</p>
      </div>
      <form onSubmit={create} className="cine-glass flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-end" data-task-form>
        <label className="block min-w-0 flex-1 text-xs font-semibold text-zinc-400">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className="cine-input mt-1 min-h-[44px] !py-2 !text-sm" placeholder="Follow up with a client" />
        </label>
        <label className="block text-xs font-semibold text-zinc-400">Due <span className="font-normal text-zinc-500">(optional)</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="cine-input mt-1 min-h-[44px] sm:w-44 !py-2 !text-sm [color-scheme:dark]" />
        </label>
        <button disabled={busy} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-60"><Plus className="h-4 w-4" />Add task</button>
      </form>
      {msg && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
      {empty && (
        <div data-task-empty className="cine-glass rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold">No tasks yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">Add a follow-up above. It stays on your account. It is not a client-portal checklist and it does not send a reminder.</p>
        </div>
      )}
      {section('overdue', 'Overdue', groups.overdue, 'open', 'Nothing overdue.')}
      {section('upcoming', 'Upcoming', groups.upcoming, 'open', 'Nothing coming up.')}
      {section('completed', 'Completed', groups.completed, 'done', 'Nothing completed yet.')}
      {demo && <p className="text-center text-xs text-zinc-500">Sample tasks for the demo account.</p>}
    </div>
  )
}
