'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { api, btnDanger, btnGhost, btnPrimary, card, fmtDate, input } from '@/components/emaillist/ui'
import { ACCEPT, BUCKET, MAX_STORAGE_BYTES, checkFile, fmtBytes, mailtoHref, objectPath, portalUrl, progress, type Kind, type Portal, type PtFile, type Share, type Task } from '@/lib/portal/core'
import type { Candidate } from '@/lib/portal/load'
import { Bar, CopyBtn } from './list'

const DEMO = 'This is the demo account, so nothing is saved.'
const KIND_LABEL: Record<Kind, string> = { invoice: 'Invoices', proposal: 'Proposals', booking: 'Bookings' }

export function PortalEditor(props: { demo: boolean; userId: string; portal: Portal; tasks: Task[]; files: PtFile[]; shares: Share[]; candidates: Candidate[]; usedBytes: number }) {
  const { demo, userId } = props
  const router = useRouter()
  const [p, setP] = useState(props.portal)
  const [tasks, setTasks] = useState(props.tasks)
  const [files, setFiles] = useState(props.files)
  const [shared, setShared] = useState(new Set(props.shares.map((s) => `${s.kind}:${s.ref_id}`)))
  const [used, setUsed] = useState(props.usedBytes)
  const [msg, setMsg] = useState(''), [up, setUp] = useState('')
  const [nt, setNt] = useState({ title: '', extra: '', who: 'client' })
  const [showAll, setShowAll] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const url = portalUrl(p.token)
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const guard = () => { if (demo) { say(DEMO); return false } return true }

  async function patch(body: Record<string, unknown>) {
    if (!guard()) return
    const r = await api(`/api/portal/portals/${p.id}`, 'PATCH', body)
    if (!r.ok) return say(r.data.error); setP(r.data.portal); say('Saved.')
  }
  async function regenerate() {
    if (!guard() || !confirm('Make a new link? The old link stops working right away.')) return
    const r = await api(`/api/portal/portals/${p.id}/regenerate`, 'POST'); if (!r.ok) return say(r.data.error)
    setP(r.data.portal); say('New link ready. Send it to your client.')
  }
  async function remove() {
    if (!guard() || !confirm(`Delete ${p.client_name}'s portal and its files? Your invoices, proposals and bookings aren't touched.`)) return
    const r = await api(`/api/portal/portals/${p.id}`, 'DELETE'); if (!r.ok) return say(r.data.error)
    router.push('/portal')
  }
  async function toggleShare(c: Candidate) {
    if (!guard()) return
    const key = `${c.kind}:${c.id}`, on = !shared.has(key)
    const r = await api('/api/portal/shares', 'POST', { portal_id: p.id, kind: c.kind, ref_id: c.id, shared: on }); if (!r.ok) return say(r.data.error)
    const n = new Set(shared); if (on) n.add(key); else n.delete(key); setShared(n)
  }
  async function addTask() {
    if (!guard()) return
    const isLink = nt.extra.startsWith('https://')
    const r = await api('/api/portal/tasks', 'POST', { portal_id: p.id, title: nt.title, who: nt.who, link: isLink ? nt.extra : null, note: isLink ? null : nt.extra || null })
    if (!r.ok) return say(r.data.error); setTasks([...tasks, r.data.task]); setNt({ title: '', extra: '', who: nt.who })
  }
  async function tick(t: Task) {
    if (!guard()) return
    const r = await api('/api/portal/tasks', 'PATCH', { id: t.id, done: !t.done_at }); if (!r.ok) return say(r.data.error)
    setTasks(tasks.map((x) => (x.id === t.id ? r.data.task : x)))
  }
  async function delTask(t: Task) {
    if (!guard()) return
    await api(`/api/portal/tasks?id=${t.id}`, 'DELETE'); setTasks(tasks.filter((x) => x.id !== t.id))
  }
  async function upload(list: FileList | null) {
    if (!list?.length || !guard()) return
    const sb = createClient()
    let u = used
    for (const f of Array.from(list)) {
      const chk = checkFile(f.name, f.size, u); if (!chk.ok) { say(chk.error); continue }
      setUp(`Uploading ${chk.name}…`)
      const path = objectPath(userId, p.id, chk.name, crypto.randomUUID().slice(0, 8))
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: chk.mime, upsert: false })
      if (error) { say('Upload failed. Try again.'); continue }
      const r = await api('/api/portal/files', 'POST', { portal_id: p.id, path, name: chk.name })
      if (!r.ok) { say(r.data.error); continue }
      u += f.size; setUsed(u); setFiles((fs) => [...fs, r.data.file])
    }
    setUp(''); if (fileRef.current) fileRef.current.value = ''
  }
  async function delFile(f: PtFile) {
    if (!guard() || !confirm(`Remove ${f.name}?`)) return
    const r = await api(`/api/portal/files?id=${f.id}`, 'DELETE'); if (!r.ok) return say(r.data.error)
    setFiles(files.filter((x) => x.id !== f.id)); setUsed(Math.max(0, used - f.size_bytes))
  }

  const pr = progress(tasks)
  const email = (p.client_email || '').toLowerCase()
  const visible = props.candidates.filter((c) => showAll || shared.has(`${c.kind}:${c.id}`) || (email && c.email === email))
  return (
    <div className="space-y-5">
      <Link href="/portal" className="text-sm text-zinc-400 hover:underline">← All portals</Link>
      <section className="cine-hero relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-950 via-[#0b1320] to-black p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold sm:text-3xl">{p.client_name}</h1><p className="text-sm text-zinc-400">{p.last_viewed_at ? `Last viewed ${fmtDate(p.last_viewed_at)} · ${p.view_count} views` : 'Your client hasn’t opened it yet'}</p></div>
          {p.revoked ? <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-300">Link turned off</span> : <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">Link live</span>}
        </div>
        <div className="mt-4"><Bar done={pr.done} total={pr.total} /></div>
        <div className="mt-4 break-all rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300">{p.revoked ? 'Link is off. Turn it back on or make a new one.' : url}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!p.revoked && <CopyBtn text={url} />}
          {!p.revoked && <a className={btnGhost} href={mailtoHref(p.client_name, p.client_email, url)}>Email from my app</a>}
          {!p.revoked && <a className={btnGhost} href={demo ? '/p/demo' : url} target="_blank" rel="noreferrer">Preview</a>}
          <button className={btnGhost} onClick={() => patch({ revoked: !p.revoked })}>{p.revoked ? 'Turn link on' : 'Turn link off'}</button>
          <button className={btnGhost} onClick={regenerate}>New link</button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">We never email your client. “Email from my app” opens your own mail app with the link filled in.</p>
      </section>
      {msg && <div role="status" className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">{msg}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-bold">Onboarding checklist <span className="text-sm font-normal text-zinc-400">{pr.pct}%</span></h2>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
                <button onClick={() => tick(t)} aria-label={t.done_at ? 'Mark not done' : 'Mark done'} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${t.done_at ? 'border-sky-400 bg-sky-400 text-black' : 'border-white/30'}`}>{t.done_at ? '✓' : ''}</button>
                <div className="min-w-0 flex-1">
                  <div className={t.done_at ? 'text-zinc-500 line-through' : ''}>{t.title}</div>
                  {t.note && <div className="text-xs text-zinc-400">{t.note}</div>}
                  {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="break-all text-xs text-sky-300 underline">{t.link}</a>}
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{t.who === 'client' ? 'Client ticks' : 'You tick'}{t.done_at ? ` · done ${fmtDate(t.done_at)}${t.done_by === 'client' ? ' by client' : ''}` : ''}</div>
                </div>
                <button onClick={() => delTask(t)} className="text-zinc-500 hover:text-red-300" aria-label="Remove step">×</button>
              </li>
            ))}
            {tasks.length === 0 && <li className="text-sm text-zinc-400">No steps yet.</li>}
          </ul>
          <div className="grid gap-2 rounded-xl border border-dashed border-white/15 p-3">
            <input className={input} placeholder="New step, e.g. Sign the agreement" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} maxLength={160} />
            <input className={input} placeholder="Note or https:// link (optional)" value={nt.extra} onChange={(e) => setNt({ ...nt, extra: e.target.value })} maxLength={600} />
            <div className="flex gap-2"><select className={input} value={nt.who} onChange={(e) => setNt({ ...nt, who: e.target.value })}><option value="client">Client ticks</option><option value="owner">I tick</option></select><button className={btnPrimary} disabled={!nt.title.trim()} onClick={addTask}>Add</button></div>
          </div>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-bold">Shared with {p.client_name.split(' ')[0]}</h2>
          <p className="text-sm text-zinc-400">Only what you tick shows up. Your client sees it read-only, with the same pay and accept links you already use.</p>
          {(['invoice', 'proposal', 'booking'] as Kind[]).map((k) => {
            const rows = visible.filter((c) => c.kind === k)
            return (
              <div key={k}><div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">{KIND_LABEL[k]}</div>
                {rows.length === 0 ? <div className="text-sm text-zinc-500">None{!showAll && email ? ` for ${email}` : ''}.</div> : (
                  <ul className="space-y-1">{rows.map((c) => (
                    <li key={c.id}><label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                      <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={shared.has(`${c.kind}:${c.id}`)} onChange={() => toggleShare(c)} />
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title} <span className="text-zinc-500">· {c.sub}</span></span>
                      <span className="text-xs text-zinc-400">{c.amount} {c.status}</span>
                    </label></li>))}</ul>
                )}
              </div>
            )
          })}
          <button className="text-sm text-sky-300 underline" onClick={() => setShowAll(!showAll)}>{showAll ? 'Only show this client’s' : 'Show everything I have'}</button>
        </section>

        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Files</h2><span className="text-xs text-zinc-500">{fmtBytes(used)} of {fmtBytes(MAX_STORAGE_BYTES)} used</span></div>
          <ul className="space-y-2">{files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><span className="min-w-0 flex-1 truncate text-sm">{f.name}</span><span className="text-xs text-zinc-500">{fmtBytes(f.size_bytes)} · {f.download_count} dl</span><button onClick={() => delFile(f)} className="text-zinc-500 hover:text-red-300" aria-label={`Remove ${f.name}`}>×</button></li>
          ))}{files.length === 0 && <li className="text-sm text-zinc-400">No files yet.</li>}</ul>
          <label className={`${btnGhost} cursor-pointer`}><input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => upload(e.target.files)} disabled={!!up} />{up || '+ Upload files'}</label>
          <p className="text-xs text-zinc-500">Private. Your client downloads through a link that expires in 60 seconds. Up to 25 MB each.</p>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="text-lg font-bold">Details</h2>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); patch({ client_name: f.get('n'), client_email: f.get('e') || null, welcome: f.get('w') }) }}>
            <input name="n" className={input} defaultValue={p.client_name} maxLength={120} aria-label="Client name" />
            <input name="e" className={input} type="email" defaultValue={p.client_email || ''} placeholder="Client email" aria-label="Client email" />
            <textarea name="w" className={`${input} min-h-24`} defaultValue={p.welcome || ''} maxLength={1000} placeholder="Welcome note shown at the top of their portal" aria-label="Welcome note" />
            <button className={btnPrimary}>Save</button>
          </form>
          <button className={btnDanger} onClick={remove}>Delete portal</button>
        </section>
      </div>
    </div>
  )
}
