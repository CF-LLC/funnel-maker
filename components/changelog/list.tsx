'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, btnGhost, btnPrimary, card, fmtDate, input, Modal, Stat } from '@/components/emaillist/ui'
import { CopyBtn } from '@/components/portal/list'
import { changelogUrl, mailtoHref, money } from '@/lib/changelog/core'
import type { ProjectRow } from '@/lib/changelog/load'

export function ProjectForm({ initial, busy, err, submit, label }: { initial?: Partial<{ title: string; client_name: string; client_email: string | null; currency: string; hourly_rate: string }>; busy: boolean; err: string; submit: (v: Record<string, string>) => void; label: string }) {
  const [v, setV] = useState({ title: initial?.title || '', client_name: initial?.client_name || '', client_email: initial?.client_email || '', currency: initial?.currency || 'USD', hourly_rate: initial?.hourly_rate || '' })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <div className="space-y-3">
      <label className="block text-sm"><span className="text-zinc-400">Project</span><input className={input} value={v.title} onChange={set('title')} maxLength={120} placeholder="Website redesign" /></label>
      <label className="block text-sm"><span className="text-zinc-400">Client name</span><input className={input} value={v.client_name} onChange={set('client_name')} maxLength={120} /></label>
      <label className="block text-sm"><span className="text-zinc-400">Client email (optional, only for your own mail app)</span><input className={input} type="email" value={v.client_email} onChange={set('client_email')} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span className="text-zinc-400">Hourly rate (for hour estimates)</span><input className={input} inputMode="decimal" value={v.hourly_rate} onChange={set('hourly_rate')} placeholder="85" /></label>
        <label className="block text-sm"><span className="text-zinc-400">Currency</span><input className={input} value={v.currency} onChange={set('currency')} maxLength={3} /></label>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button className={`${btnPrimary} w-full`} disabled={busy || !v.title.trim() || !v.client_name.trim()} onClick={() => submit(v)}>{busy ? 'Saving…' : label}</button>
    </div>
  )
}

export function ProjectList({ demo, projects }: { demo: boolean; projects: ProjectRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const waiting = projects.reduce((a, p) => a + p.pendingCount, 0)
  const ready = projects.reduce((a, p) => a + p.readyCount, 0)
  const cur = projects[0]?.currency || 'USD'
  const approved = projects.filter((p) => p.currency === cur).reduce((a, p) => a + p.approved, 0)
  async function create(v: Record<string, string>) {
    setErr('')
    if (demo) return setErr('This is the demo account, so nothing is saved.')
    setBusy(true)
    const r = await api('/api/changelog/projects', 'POST', v)
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    router.push(`/change-log/${r.data.project.id}`)
  }
  return (
    <div className="space-y-6">
      <section className="cine-hero relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950 via-[#150b20] to-black p-6 sm:p-8">
        <div className="cine-rise relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Change log</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Get paid for the extras.</h1>
          <p className="mt-2 max-w-xl text-zinc-300">Log every “could you also…”, send one private link, and let your client OK each one. Approved extras drop straight into an invoice.</p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setOpen(true)}>+ New project</button>
        </div>
      </section>
      <div className="grid grid-cols-3 gap-3"><Stat label="Waiting on client" value={waiting} /><Stat label="Ready to invoice" value={ready} hint="approved extras" /><Stat label="Approved" value={money(approved, cur)} /></div>
      {projects.length === 0 ? (
        <div className={`${card} text-center text-zinc-400`}>No projects yet. Add one and log the first extra request.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const url = changelogUrl(p.token)
            return (
              <li key={p.id} className={`${card} space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Link href={`/change-log/${p.id}`} className="block truncate text-lg font-bold hover:underline">{p.title}</Link><div className="truncate text-sm text-zinc-400">{p.client_name}</div></div>
                  {p.revoked ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Link off</span> : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Live</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="text-emerald-300">{money(p.approved, p.currency)} approved</span>{p.pendingCount > 0 && <span className="text-amber-300">{p.pendingCount} waiting</span>}{p.readyCount > 0 && <span className="text-purple-300">{p.readyCount} to invoice</span>}</div>
                <div className="text-xs text-zinc-500">{p.last_viewed_at ? `Last viewed ${fmtDate(p.last_viewed_at)} · ${p.view_count} views` : 'Not opened yet'}</div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/change-log/${p.id}`} className={btnPrimary}>Open</Link>
                  {!p.revoked && <CopyBtn text={url} />}
                  {!p.revoked && <a className={btnGhost} href={mailtoHref(p.client_name, p.client_email, url)}>Email from my app</a>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New project"><ProjectForm busy={busy} err={err} submit={create} label="Create project" /></Modal>
    </div>
  )
}
