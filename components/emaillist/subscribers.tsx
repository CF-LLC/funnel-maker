'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CONSENT_LABEL, STATUS_LABEL, csvToRows, normTags, type Settings, type Status, type Subscriber } from '@/lib/emaillist/core'
import { Modal, api, btnGhost, btnPrimary, card, fmtDate, input } from './ui'

const DOT: Record<Status, string> = { subscribed: 'bg-emerald-400', pending: 'bg-amber-400', unsubscribed: 'bg-zinc-500' }

export function SubscribersView({ initial, settings, demo }: { initial: Subscriber[]; settings: Settings; demo: boolean }) {
  const [subs, setSubs] = useState(initial)
  const router = useRouter()
  useEffect(() => setSubs(initial), [initial])
  const [q, setQ] = useState(''); const [status, setStatus] = useState<'all' | Status>('all'); const [tag, setTag] = useState('')
  const [adding, setAdding] = useState(false); const [importing, setImporting] = useState(false)
  const [open, setOpen] = useState<Subscriber | null>(null)
  const [msg, setMsg] = useState('')
  const tags = useMemo(() => [...new Set(subs.flatMap((s) => s.tags))].sort(), [subs])
  const shown = subs.filter((s) => (status === 'all' || s.status === status) && (!tag || s.tags.includes(tag)) && (!q || `${s.email} ${s.name || ''}`.toLowerCase().includes(q.toLowerCase())))
  const count = (st: Status) => subs.filter((s) => s.status === st).length
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-[#0f1020] to-cyan-950 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Your list</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{count('subscribed').toLocaleString()} <span className="text-zinc-300">subscribed</span></h1>
        <p className="mt-1 text-sm text-zinc-400">{count('pending')} awaiting confirmation · {count('unsubscribed')} unsubscribed</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => setAdding(true)}>+ Add subscriber</button>
          <button className={btnGhost} onClick={() => setImporting(true)}>Import CSV</button>
          <a className={btnGhost} href={demo ? undefined : '/api/emaillist/export'} aria-disabled={demo} onClick={(e) => { if (demo) { e.preventDefault(); flash('Export is off on the demo account.') } }}>Export CSV</a>
          {settings.slug && <a className={btnGhost} href={`/e/${settings.slug}`} target="_blank" rel="noreferrer">Signup page ↗</a>}
        </div>
      </section>
      {msg && <div role="status" className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">{msg}</div>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={input} placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className={`${input} sm:w-48`} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Status">
          <option value="all">All statuses</option>{(['subscribed', 'pending', 'unsubscribed'] as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className={`${input} sm:w-44`} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
          <option value="">All tags</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}
        </select>
      </div>

      {subs.length === 0 ? (
        <div className={`${card} py-12 text-center`}>
          <p className="text-lg font-semibold">No subscribers yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">Share your signup page, embed the form on your site, or import people who already agreed to hear from you.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {shown.map((s) => (
            <li key={s.id}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5" onClick={() => setOpen(s)}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.status]}`} title={STATUS_LABEL[s.status]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name || s.email}</span>
                  {s.name && <span className="block truncate text-xs text-zinc-400">{s.email}</span>}
                </span>
                <span className="hidden gap-1 sm:flex">{s.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">#{t}</span>)}</span>
                <span className="shrink-0 text-xs text-zinc-500">{fmtDate(s.created_at)}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-zinc-400">Nobody matches those filters.</li>}
        </ul>
      )}

      <AddDialog open={adding} onClose={() => setAdding(false)} demo={demo} onAdded={(s) => { setSubs((x) => [s, ...x]); flash(`Added ${s.email}.`) }} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} demo={demo} onDone={(n) => { flash(n); router.refresh() }} />
      <DetailDialog sub={open} onClose={() => setOpen(null)} demo={demo}
        onChange={(s) => { setSubs((x) => x.map((y) => (y.id === s.id ? s : y))); setOpen(s) }}
        onDelete={(id) => { setSubs((x) => x.filter((y) => y.id !== id)); setOpen(null); flash('Deleted.') }} />
    </div>
  )
}

function AddDialog({ open, onClose, demo, onAdded }: { open: boolean; onClose: () => void; demo: boolean; onAdded: (s: Subscriber) => void }) {
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [tags, setTags] = useState(''); const [attest, setAttest] = useState(false)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (demo) return setErr('The demo account can’t add people.')
    setBusy(true)
    const r = await api('/api/emaillist/subscribers', 'POST', { email, name, tags: normTags(tags), attest })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Could not add.')
    onAdded(r.data.subscriber); setEmail(''); setName(''); setTags(''); setAttest(false); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a subscriber">
      <form onSubmit={save} className="space-y-3">
        <input className={input} type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <input className={input} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        <input className={input} placeholder="Tags, comma separated (optional)" value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags" />
        <label className="flex gap-2 text-sm text-zinc-300"><input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1" required />This person agreed to get emails from me. I won’t add people who didn’t.</label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy || !attest}>{busy ? 'Adding…' : 'Add subscriber'}</button>
      </form>
    </Modal>
  )
}

function ImportDialog({ open, onClose, demo, onDone }: { open: boolean; onClose: () => void; demo: boolean; onDone: (msg: string) => void }) {
  const [text, setText] = useState(''); const [tags, setTags] = useState(''); const [attest, setAttest] = useState(false)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const preview = useMemo(() => (text ? csvToRows(text, normTags(tags)) : null), [text, tags])
  async function run() {
    setErr('')
    if (demo) return setErr('The demo account can’t import.')
    setBusy(true)
    const r = await api('/api/emaillist/import', 'POST', { rows: preview!.rows, attest, how: 'CSV import (owner confirmed consent)' })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Import failed.')
    onDone(`Imported ${r.data.added} new subscriber${r.data.added === 1 ? '' : 's'}${r.data.alreadyOnList ? `, ${r.data.alreadyOnList} were already on your list` : ''}.`)
    setText(''); setAttest(false); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Import from CSV">
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">One person per row. We look for an <b>email</b> column, plus optional <b>name</b> and <b>tags</b>. Up to 5,000 rows.</p>
        <input type="file" accept=".csv,text/csv" className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-black" aria-label="CSV file"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()) }} />
        <textarea className={`${input} h-28 font-mono text-xs`} placeholder={'email,name,tags\nana@example.com,Ana,vip'} value={text} onChange={(e) => setText(e.target.value)} aria-label="CSV text" />
        <input className={input} placeholder="Add these tags to everyone (optional)" value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags for everyone" />
        {preview && <p className="text-sm text-zinc-300">{preview.rows.length} valid · {preview.skipped} skipped · {preview.duplicates} duplicates{preview.tooMany && ' · over 5,000, extra rows ignored'}</p>}
        <label className="flex gap-2 text-sm text-zinc-300"><input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1" />Everyone in this file agreed to get emails from me (bought or scraped lists aren’t allowed).</label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className={`${btnPrimary} w-full`} onClick={run} disabled={busy || !attest || !preview?.rows.length}>{busy ? 'Importing…' : `Import ${preview?.rows.length || ''}`}</button>
      </div>
    </Modal>
  )
}

function DetailDialog({ sub, onClose, demo, onChange, onDelete }: { sub: Subscriber | null; onClose: () => void; demo: boolean; onChange: (s: Subscriber) => void; onDelete: (id: string) => void }) {
  const [tag, setTag] = useState(''); const [err, setErr] = useState('')
  if (!sub) return null
  async function patch(body: object) {
    setErr('')
    if (demo) return setErr('Changes aren’t saved on the demo account.')
    const r = await api('/api/emaillist/subscribers', 'PATCH', { ids: [sub!.id], ...body })
    if (!r.ok) return setErr(r.data.error || 'Could not save.')
    if (r.data.subscribers?.[0]) onChange(r.data.subscribers[0])
  }
  async function del() {
    if (demo) return setErr('Changes aren’t saved on the demo account.')
    if (!confirm(`Delete ${sub!.email}? This removes their consent record too. To stop emailing them, unsubscribe them instead.`)) return
    const r = await api('/api/emaillist/subscribers', 'DELETE', { ids: [sub!.id] })
    if (r.ok) onDelete(sub!.id); else setErr(r.data.error || 'Could not delete.')
  }
  return (
    <Modal open onClose={onClose} title={sub.name || sub.email}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-400">Email</dt><dd className="break-all">{sub.email}</dd>
        <dt className="text-zinc-400">Status</dt><dd>{STATUS_LABEL[sub.status]}{sub.unsubscribed_at && ` · ${fmtDate(sub.unsubscribed_at)}`}</dd>
        <dt className="text-zinc-400">Consent</dt><dd>{CONSENT_LABEL[sub.consent] || sub.consent} · {fmtDate(sub.consent_at)}{sub.consent_detail && <span className="block text-xs text-zinc-500">{sub.consent_detail}</span>}</dd>
        {sub.confirmed_at && <><dt className="text-zinc-400">Confirmed</dt><dd>{fmtDate(sub.confirmed_at)}</dd></>}
      </dl>
      <div className="mt-4">
        <div className="flex flex-wrap gap-1.5">{sub.tags.map((t) => <button key={t} onClick={() => patch({ removeTag: t })} className="rounded-full bg-white/10 px-2.5 py-1 text-xs hover:bg-red-500/30" title="Remove tag">#{t} ×</button>)}</div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { patch({ addTag: tag }); setTag('') } }}>
          <input className={input} placeholder="Add a tag" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="New tag" /><button className={btnGhost}>Add</button>
        </form>
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {sub.status !== 'unsubscribed' && <button className={btnGhost} onClick={() => patch({ unsubscribe: true })}>Unsubscribe</button>}
        <button className="ml-auto text-sm text-red-400 hover:underline" onClick={del}>Delete</button>
      </div>
      {sub.status === 'unsubscribed' && <p className="mt-3 text-xs text-zinc-500">Unsubscribed people can only rejoin themselves, from your signup page.</p>}
    </Modal>
  )
}
