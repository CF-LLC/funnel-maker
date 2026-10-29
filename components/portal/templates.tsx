'use client'
import { useState } from 'react'
import { api, btnDanger, btnGhost, btnPrimary, card, input } from '@/components/emaillist/ui'
import { STARTER_TEMPLATE, type Template, type TemplateItem } from '@/lib/portal/core'

export function TemplatesEditor({ demo, templates: initial }: { demo: boolean; templates: Template[] }) {
  const [list, setList] = useState(initial)
  const [edit, setEdit] = useState<{ id?: string; name: string; items: TemplateItem[] } | null>(null)
  const [err, setErr] = useState('')
  const set = (i: number, k: keyof TemplateItem, v: string) => edit && setEdit({ ...edit, items: edit.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) })
  async function save() {
    if (!edit) return
    if (demo) return setErr('This is the demo account, so nothing is saved.')
    const r = await api('/api/portal/templates', 'POST', edit)
    if (!r.ok) return setErr(r.data.error)
    setList(edit.id ? list.map((t) => (t.id === edit.id ? r.data.template : t)) : [...list, r.data.template]); setEdit(null); setErr('')
  }
  async function del(id: string) {
    if (demo || !confirm('Delete this template? Existing portals keep their checklists.')) return
    await api(`/api/portal/templates?id=${id}`, 'DELETE'); setList(list.filter((t) => t.id !== id))
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">Checklist templates</h1><button className={btnPrimary} onClick={() => setEdit({ name: 'New client', items: STARTER_TEMPLATE })}>+ New template</button></div>
      <p className="text-sm text-zinc-400">Reuse the same onboarding steps for every new client. Changing a template doesn’t change portals you already made.</p>
      {list.map((t) => (
        <div key={t.id} className={`${card} flex items-center justify-between gap-3`}>
          <div><div className="font-bold">{t.name}</div><div className="text-sm text-zinc-400">{t.items.length} steps</div></div>
          <div className="flex gap-2"><button className={btnGhost} onClick={() => setEdit({ id: t.id, name: t.name, items: t.items })}>Edit</button><button className={btnGhost} onClick={() => del(t.id)}>Delete</button></div>
        </div>
      ))}
      {edit && (
        <div className={`${card} space-y-3`}>
          <input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={80} aria-label="Template name" />
          {edit.items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input className={input} placeholder="Step" value={it.title} onChange={(e) => set(i, 'title', e.target.value)} maxLength={160} />
              <input className={input} placeholder="Note or https:// link (optional)" value={it.link || it.note || ''} onChange={(e) => { const v = e.target.value; setEdit({ ...edit, items: edit.items.map((x, j) => (j === i ? { ...x, link: v.startsWith('https://') ? v : null, note: v.startsWith('https://') ? null : v || null } : x)) }) }} />
              <select className={input} value={it.who} onChange={(e) => set(i, 'who', e.target.value)}><option value="client">Client ticks</option><option value="owner">I tick</option></select>
              <button className={btnDanger} onClick={() => setEdit({ ...edit, items: edit.items.filter((_, j) => j !== i) })} aria-label="Remove step">×</button>
            </div>
          ))}
          <button className={btnGhost} disabled={edit.items.length >= 30} onClick={() => setEdit({ ...edit, items: [...edit.items, { title: '', who: 'client' }] })}>+ Add step</button>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <div className="flex gap-2"><button className={btnPrimary} onClick={save}>Save template</button><button className={btnGhost} onClick={() => { setEdit(null); setErr('') }}>Cancel</button></div>
        </div>
      )}
    </div>
  )
}
