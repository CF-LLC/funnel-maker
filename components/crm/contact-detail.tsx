'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarClock, Check, Loader2, Pencil, Trash2 } from 'lucide-react'
import { CRM_STATUSES, STATUS_LABEL, type Activity, type Contact, type CrmStatus } from '@/lib/crm/core'
import type { Note } from '@/lib/crm/load'
import { Avatar, SourceBadge, StatusPill, money, shortDate } from './bits'

const DEMO_MSG = 'This is the demo account, so changes are not saved.'
async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
  return j
}

export function ContactDetail({ contact, activities, notes: initialNotes, demo }: { contact: Contact; activities: Activity[]; notes: Note[]; demo: boolean }) {
  const [c, setC] = useState(contact)
  const [form, setForm] = useState({ name: contact.name, phone: contact.phone, company: contact.company, status: contact.status as CrmStatus, tags: contact.tags.join(', '), follow_up_on: contact.followUpOn || '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [notes, setNotes] = useState(initialNotes)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [noteErr, setNoteErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    if (demo) return setMsg({ ok: false, text: DEMO_MSG })
    setSaving(true)
    try {
      const { contact: row } = await call('/api/crm/contact', 'PUT', { email: c.email, ...form })
      setC({ ...c, name: row.name || c.name, phone: row.phone || '', company: row.company || '', status: row.status, tags: row.tags, followUpOn: row.follow_up_on })
      setForm((f) => ({ ...f, tags: row.tags.join(', ') }))
      setMsg({ ok: true, text: 'Saved' })
    } catch (err: any) { setMsg({ ok: false, text: err.message }) } finally { setSaving(false) }
  }
  async function addNote() {
    setNoteErr('')
    if (demo) return setNoteErr(DEMO_MSG)
    try { const { note } = await call('/api/crm/notes', 'POST', { email: c.email, body: draft }); setNotes([note, ...notes]); setDraft('') } catch (err: any) { setNoteErr(err.message) }
  }
  async function saveNote() {
    if (!editing) return; setNoteErr('')
    if (demo) return setNoteErr(DEMO_MSG)
    try { const { note } = await call('/api/crm/notes', 'PATCH', editing); setNotes(notes.map((n) => (n.id === note.id ? note : n))); setEditing(null) } catch (err: any) { setNoteErr(err.message) }
  }
  async function delNote(id: string) {
    setNoteErr('')
    if (demo) return setNoteErr(DEMO_MSG)
    if (!confirm('Delete this note?')) return
    try { await call(`/api/crm/notes?id=${id}`, 'DELETE'); setNotes(notes.filter((n) => n.id !== id)) } catch (err: any) { setNoteErr(err.message) }
  }
  const field = (k: 'name' | 'phone' | 'company', label: string, type = 'text') => (
    <label className="block text-xs font-semibold text-zinc-400">{label}
      <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="cine-input mt-1 !py-2 !text-sm" maxLength={k === 'phone' ? 50 : 200} />
    </label>
  )
  return (
    <div className="space-y-6">
      <Link href="/crm" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" />All clients</Link>

      <section className="cine-hero relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-8" style={{ background: 'radial-gradient(120% 140% at 0% 0%, #be123c55, transparent 55%), radial-gradient(120% 120% at 100% 100%, #4338ca55, transparent 60%), #111116' }}>
        <div className="cine-grain" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={c.name} email={c.email} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{c.name || c.email}</h1>
            <p className="truncate text-sm text-zinc-300">{c.email}{c.company ? ` · ${c.company}` : ''}{c.phone ? ` · ${c.phone}` : ''}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill s={c.status} />{c.sources.map((s) => <SourceBadge key={s} s={s} n={c.counts[s]} />)}{c.tags.map((t) => <span key={t} className="text-xs text-zinc-400">#{t}</span>)}</div>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['First seen', shortDate(c.firstSeen)], ['Last activity', shortDate(c.lastActivity)], ['Invoiced', c.invoicedCents ? money(c.invoicedCents, c.currency) : '-'], ['Paid', c.invoicedCents ? money(c.paidCents, c.currency) : '-']].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10"><div className="text-lg font-bold">{v}</div><div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{l}</div></div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <form onSubmit={save} className="cine-glass space-y-3 rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Details</h2>
            <div>
              <span className="text-xs font-semibold text-zinc-400">Status</span>
              <div role="radiogroup" aria-label="Status" className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {CRM_STATUSES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={form.status === s} onClick={() => setForm({ ...form, status: s })}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold ring-1 transition ${form.status === s ? 'bg-white text-black ring-white' : 'text-zinc-300 ring-white/15 hover:ring-white/40'}`}>{STATUS_LABEL[s]}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{field('name', 'Name')}{field('company', 'Company')}{field('phone', 'Phone', 'tel')}
              <label className="block text-xs font-semibold text-zinc-400">Follow up on
                <input type="date" value={form.follow_up_on} onChange={(e) => setForm({ ...form, follow_up_on: e.target.value })} className="cine-input mt-1 !py-2 !text-sm [color-scheme:dark]" />
              </label>
            </div>
            <label className="block text-xs font-semibold text-zinc-400">Tags <span className="font-normal text-zinc-500">(comma separated)</span>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, referral" className="cine-input mt-1 !py-2 !text-sm" />
            </label>
            <div className="flex items-center gap-3">
              <button disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save</button>
              {msg && <span role="status" className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</span>}
            </div>
          </form>

          <section className="cine-glass rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Notes</h2>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} rows={3} placeholder="Add a private note…" className="cine-input mt-3 !text-sm" />
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={addNote} disabled={!draft.trim()} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">Add note</button>
              {noteErr && <span role="alert" className="text-sm text-rose-300">{noteErr}</span>}
            </div>
            <ul className="mt-4 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                  {editing?.id === n.id ? (
                    <div>
                      <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={3} maxLength={5000} className="cine-input !text-sm" aria-label="Edit note" />
                      <div className="mt-2 flex gap-2"><button type="button" onClick={saveNote} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Save</button><button type="button" onClick={() => setEditing(null)} className="rounded-full px-3 py-1 text-xs text-zinc-300 ring-1 ring-white/15">Cancel</button></div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm text-zinc-100">{n.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
                        <span>{shortDate(n.created_at)}{n.updated_at !== n.created_at ? ' · edited' : ''}</span>
                        <button type="button" onClick={() => setEditing({ id: n.id, body: n.body })} className="ml-auto inline-flex items-center gap-1 hover:text-white"><Pencil className="h-3 w-3" />Edit</button>
                        <button type="button" onClick={() => delNote(n.id)} className="inline-flex items-center gap-1 hover:text-rose-300"><Trash2 className="h-3 w-3" />Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {notes.length === 0 && <li className="text-sm text-zinc-500">No notes yet.</li>}
            </ul>
          </section>
        </div>

        <section className="cine-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Timeline</h2>
          {c.followUpOn && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30"><CalendarClock className="h-3.5 w-3.5" />Follow up on {shortDate(c.followUpOn + 'T12:00:00Z')}</p>}
          <ol className="relative mt-4 space-y-4 border-l border-white/10 pl-5">
            {activities.map((a) => (
              <li key={`${a.source}-${a.id}`} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-400 ring-4 ring-[#14141a]" />
                <Link href={a.href} className="group block rounded-xl p-2 -m-2 transition hover:bg-white/[0.04]">
                  <div className="flex flex-wrap items-center gap-2"><SourceBadge s={a.source} /><span className="text-xs text-zinc-500">{shortDate(a.at)}</span></div>
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold group-hover:text-rose-200">{a.title}<ArrowUpRight className="h-3.5 w-3.5 opacity-50" /></p>
                  {typeof a.amountCents === 'number' && <p className="text-xs text-zinc-400">{money(a.amountCents, a.currency || 'USD')}{a.paid ? ' · paid' : ''}</p>}
                  {a.detail && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{a.detail}</p>}
                </Link>
              </li>
            ))}
            {activities.length === 0 && <li className="text-sm text-zinc-500">Nothing from your other tools yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}
