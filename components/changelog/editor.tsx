'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, btnDanger, btnGhost, btnPrimary, card, fmtDate, input, Modal, Stat } from '@/components/emaillist/ui'
import { CopyBtn } from '@/components/portal/list'
import { changelogUrl, estLabel, mailtoHref, money, totals, type Project, type Req } from '@/lib/changelog/core'
import type { OpenInvoice } from '@/lib/changelog/load'
import { ProjectForm } from './list'

const BADGE = { pending: 'bg-amber-500/15 text-amber-300', approved: 'bg-emerald-500/15 text-emerald-300', declined: 'bg-zinc-500/20 text-zinc-300' } as const
const LABEL = { pending: 'Waiting', approved: 'Approved', declined: 'Declined' } as const
const DEMO = 'This is the demo account, so nothing is saved.'

function RequestForm({ initial, busy, submit, label }: { initial?: Req; busy: boolean; submit: (v: Record<string, string>) => void; label: string }) {
  const [v, setV] = useState({ title: initial?.title || '', description: initial?.description || '', est_kind: initial?.est_kind || 'hours', hours: initial?.hours ? String(initial.hours) : '', price: initial?.price_cents ? String(initial.price_cents / 100) : '' })
  return (
    <div className="space-y-3">
      <label className="block text-sm"><span className="text-zinc-400">What did they ask for?</span><input className={input} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} /></label>
      <label className="block text-sm"><span className="text-zinc-400">Details (optional)</span><textarea className={input} rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={2000} /></label>
      <div className="flex gap-2">{(['hours', 'price'] as const).map((k) => <button key={k} type="button" className={v.est_kind === k ? btnPrimary : btnGhost} onClick={() => setV({ ...v, est_kind: k })}>{k === 'hours' ? 'Hours' : 'Fixed price'}</button>)}</div>
      {v.est_kind === 'hours'
        ? <label className="block text-sm"><span className="text-zinc-400">Estimated hours</span><input className={input} inputMode="decimal" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value })} placeholder="2.5" /></label>
        : <label className="block text-sm"><span className="text-zinc-400">Price</span><input className={input} inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} placeholder="150" /></label>}
      <button className={`${btnPrimary} w-full`} disabled={busy || !v.title.trim()} onClick={() => submit(v)}>{busy ? 'Saving…' : label}</button>
    </div>
  )
}

export function ProjectEditor({ demo, project, requests, invoices }: { demo: boolean; project: Project; requests: Req[]; invoices: OpenInvoice[] }) {
  const router = useRouter()
  const [p, setP] = useState(project)
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'export' | 'settings'>(null)
  const [editing, setEditing] = useState<Req | null>(null)
  const [target, setTarget] = useState('new')
  const [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const t = totals(requests, p.hourly_rate_cents)
  const url = changelogUrl(p.token)

  async function run(fn: () => Promise<{ ok: boolean; data: any }>, after?: (d: any) => void) {
    setErr(''); setMsg('')
    if (demo) return setErr(DEMO)
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    after?.(r.data); setModal(null); setEditing(null); router.refresh()
  }
  const saveReq = (v: Record<string, string>) => run(() => editing ? api(`/api/changelog/requests/${editing.id}`, 'PATCH', v) : api('/api/changelog/requests', 'POST', { ...v, project_id: p.id }))
  const exportNow = () => run(() => api('/api/changelog/export', 'POST', { project_id: p.id, invoice_id: target === 'new' ? undefined : target }), (d) => router.push(`/invoices/${d.invoice_id}`))

  return (
    <div className="space-y-6">
      <Link href="/change-log" className="text-sm text-zinc-400 hover:underline">← All projects</Link>
      <section className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h1 className="truncate text-2xl font-extrabold">{p.title}</h1><div className="text-sm text-zinc-400">{p.client_name}{p.hourly_rate_cents ? ` · ${money(p.hourly_rate_cents, p.currency)}/h` : ' · no hourly rate'}</div></div>
          {p.revoked ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Link off</span> : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Live</span>}
        </div>
        <div className="break-all rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-zinc-400">{p.revoked ? 'Link is turned off.' : url}</div>
        <div className="flex flex-wrap gap-2">
          {!p.revoked && <CopyBtn text={url} />}
          {!p.revoked && <a className={btnGhost} href={mailtoHref(p.client_name, p.client_email, url)}>Email from my app</a>}
          <a className={btnGhost} href={`/c/${demo ? 'demo' : p.token}`} target="_blank" rel="noreferrer">Preview</a>
          <button className={btnGhost} onClick={() => setModal('settings')}>Edit project</button>
          <button className={btnGhost} onClick={() => run(() => api(`/api/changelog/projects/${p.id}`, 'PATCH', { revoked: !p.revoked }), (d) => setP(d.project))}>{p.revoked ? 'Turn link on' : 'Turn link off'}</button>
          <button className={btnGhost} onClick={() => confirm('Make a new link? The old one stops working right away.') && run(() => api(`/api/changelog/projects/${p.id}/regenerate`, 'POST'), (d) => setP(d.project))}>New link</button>
        </div>
        <div className="text-xs text-zinc-500">{p.last_viewed_at ? `Client last viewed ${fmtDate(p.last_viewed_at)} · ${p.view_count} views` : 'Your client hasn’t opened it yet'}</div>
      </section>
      <div className="grid grid-cols-3 gap-3"><Stat label="Approved" value={money(t.approved, p.currency)} /><Stat label="Waiting" value={money(t.pending, p.currency)} hint={`${t.pendingCount} request${t.pendingCount === 1 ? '' : 's'}`} /><Stat label="To invoice" value={money(t.ready, p.currency)} hint={`${t.readyCount} approved`} /></div>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      {msg && <p role="status" className="text-sm text-emerald-300">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={() => { setEditing(null); setModal('add') }}>+ Log a request</button>
        <button className={btnGhost} disabled={!t.readyCount} onClick={() => setModal('export')}>Add {t.readyCount || ''} approved to an invoice</button>
      </div>
      {requests.length === 0 ? <div className={`${card} text-center text-zinc-400`}>No requests yet. Log the first “could you also…”.</div> : (
        <ul className="space-y-2">{requests.map((r) => (
          <li key={r.id} className={`${card} flex flex-wrap items-start gap-3`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.title}</span><span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[r.status]}`}>{LABEL[r.status]}</span>{r.invoice_id && <Link href={`/invoices/${r.invoice_id}`} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-300 hover:underline">Invoiced</Link>}</div>
              {r.description && <p className="mt-1 whitespace-pre-line text-sm text-zinc-400">{r.description}</p>}
              {r.decided_at && <p className="mt-1 text-xs text-zinc-500">{LABEL[r.status]} by {r.decided_name} · {fmtDate(r.decided_at)}{r.decided_note ? ` · “${r.decided_note}”` : ''}</p>}
            </div>
            <div className="text-right"><div className="font-bold tabular-nums">{estLabel(r, p.currency, p.hourly_rate_cents)}</div>
              {!r.invoice_id && <div className="mt-2 flex gap-2"><button className={btnGhost} onClick={() => { setEditing(r); setModal('edit') }}>Edit</button><button className={btnDanger} onClick={() => confirm('Delete this request?') && run(() => api(`/api/changelog/requests/${r.id}`, 'DELETE'))}>Delete</button></div>}
            </div>
          </li>))}</ul>
      )}
      <div className="pt-4"><button className={btnDanger} onClick={() => confirm('Delete this project and its requests? Invoices you already made stay.') && run(() => api(`/api/changelog/projects/${p.id}`, 'DELETE'), () => router.push('/change-log'))}>Delete project</button></div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={editing ? 'Edit request' : 'Log a request'}>
        {editing && editing.status !== 'pending' && <p className="mb-3 text-sm text-amber-200">Changing the request sends it back to your client for a fresh OK.</p>}
        <RequestForm key={editing?.id || 'new'} initial={editing || undefined} busy={busy} submit={saveReq} label={editing ? 'Save' : 'Add request'} />
        {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      </Modal>
      <Modal open={modal === 'settings'} onClose={() => setModal(null)} title="Edit project">
        <ProjectForm busy={busy} err={err} label="Save" initial={{ title: p.title, client_name: p.client_name, client_email: p.client_email, currency: p.currency, hourly_rate: p.hourly_rate_cents ? String(p.hourly_rate_cents / 100) : '' }} submit={(v) => run(() => api(`/api/changelog/projects/${p.id}`, 'PATCH', v), (d) => setP(d.project))} />
      </Modal>
      <Modal open={modal === 'export'} onClose={() => setModal(null)} title="Add approved extras to an invoice">
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">{t.readyCount} approved request{t.readyCount === 1 ? '' : 's'} · {money(t.ready, p.currency)}. Each becomes a line item in Invoices.</p>
          <label className="block text-sm"><span className="text-zinc-400">Put them on</span>
            <select className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="new">A new invoice (unpaid, not sent)</option>
              {invoices.map((i) => <option key={i.id} value={i.id}>{i.number}{i.client_name ? ` · ${i.client_name}` : ''} (unpaid)</option>)}
            </select>
          </label>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button className={`${btnPrimary} w-full`} disabled={busy} onClick={exportNow}>{busy ? 'Adding…' : 'Add to invoice'}</button>
        </div>
      </Modal>
    </div>
  )
}
