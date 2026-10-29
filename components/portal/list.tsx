'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, btnGhost, btnPrimary, card, fmtDate, input, Modal, Stat } from '@/components/emaillist/ui'
import { mailtoHref, portalUrl, type Portal, type Template } from '@/lib/portal/core'

type Row = Portal & { done: number; total: number }
export function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all" style={{ width: `${pct}%` }} /></div><span className="w-14 text-right text-xs tabular-nums text-zinc-400">{done}/{total}</span></div>
}
export function CopyBtn({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return <button className={btnGhost} onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500) })}>{ok ? 'Copied ✓' : label}</button>
}

export function PortalList({ demo, portals, templates, contacts }: { demo: boolean; portals: Row[]; templates: Template[]; contacts: { name: string; email: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [tpl, setTpl] = useState(templates[0]?.id || 'starter')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const active = portals.filter((p) => !p.revoked)
  const viewed = portals.filter((p) => p.last_viewed_at && Date.now() - +new Date(p.last_viewed_at) < 7 * 864e5).length
  const done = portals.filter((p) => p.total && p.done === p.total).length

  async function create() {
    setErr('')
    if (demo) return setErr('This is the demo account, so nothing is saved.')
    setBusy(true)
    const r = await api('/api/portal/portals', 'POST', { client_name: name, client_email: email || null, template_id: tpl === 'starter' ? undefined : tpl })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    router.push(`/portal/${r.data.portal.id}`)
  }
  return (
    <div className="space-y-6">
      <section className="cine-hero relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-950 via-[#0b1320] to-black p-6 sm:p-8">
        <div className="cine-rise relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Client portal</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">One private link per client.</h1>
          <p className="mt-2 max-w-xl text-zinc-300">Onboarding checklist, files, and the invoices, proposals and bookings you choose to share. No login for your client.</p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setOpen(true)}>+ New client portal</button>
        </div>
      </section>
      <div className="grid grid-cols-3 gap-3"><Stat label="Active" value={active.length} /><Stat label="Viewed this week" value={viewed} /><Stat label="Onboarded" value={done} hint="checklist complete" /></div>
      {portals.length === 0 ? (
        <div className={`${card} text-center text-zinc-400`}>No portals yet. Create one for your next client.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {portals.map((p) => {
            const url = portalUrl(p.token)
            return (
              <li key={p.id} className={`${card} space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Link href={`/portal/${p.id}`} className="block truncate text-lg font-bold hover:underline">{p.client_name}</Link><div className="truncate text-sm text-zinc-400">{p.client_email || 'No email'}</div></div>
                  {p.revoked ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Link off</span> : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Live</span>}
                </div>
                <Bar done={p.done} total={p.total} />
                <div className="text-xs text-zinc-500">{p.last_viewed_at ? `Last viewed ${fmtDate(p.last_viewed_at)} · ${p.view_count} views` : 'Not opened yet'}</div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/portal/${p.id}`} className={btnPrimary}>Open</Link>
                  {!p.revoked && <CopyBtn text={url} />}
                  {!p.revoked && <a className={btnGhost} href={mailtoHref(p.client_name, p.client_email, url)}>Email from my app</a>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New client portal">
        <div className="space-y-3">
          {contacts.length > 0 && (
            <label className="block text-sm"><span className="text-zinc-400">From your CRM</span>
              <select className={input} defaultValue="" onChange={(e) => { const c = contacts[Number(e.target.value)]; if (c) { setName(c.name); setEmail(c.email) } }}>
                <option value="">Pick a contact…</option>
                {contacts.map((c, i) => <option key={c.email} value={i}>{c.name} · {c.email}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm"><span className="text-zinc-400">Client name</span><input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
          <label className="block text-sm"><span className="text-zinc-400">Email (optional, only used for your own mail app)</span><input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm"><span className="text-zinc-400">Checklist</span>
            <select className={input} value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.items.length} steps)</option>)}
              <option value="starter">Starter checklist (5 steps)</option>
              <option value="none">Empty</option>
            </select>
          </label>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button className={`${btnPrimary} w-full`} disabled={busy || !name.trim()} onClick={create}>{busy ? 'Creating…' : 'Create portal'}</button>
        </div>
      </Modal>
    </div>
  )
}
