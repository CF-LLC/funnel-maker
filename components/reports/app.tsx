'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ChevronRight, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { api, btnGhost, btnPrimary, card, input, Modal } from '@/components/emaillist/ui'
import { monthLabel, type Client } from '@/lib/reports/core'

type Row = Client & { reports: number; shared: number; latest: string | null }
type Data = { demo: boolean; brand: { business_name: string | null; logo_url: string | null }; clients: Row[] }
export const DEMO_NOTE = 'Demo: shown here only, nothing is saved.'

export function useToast() {
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3800); return () => clearTimeout(t) }, [toast])
  const el = toast ? <div role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 text-center text-sm shadow-2xl backdrop-blur">{toast}</div> : null
  return [el, setToast] as const
}

export function ReportsHome() {
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [toastEl, setToast] = useToast()
  const load = useCallback(async () => { const r = await api('/api/reports', 'GET'); if (r.ok) setD(r.data); else setErr(r.data.error || 'Could not load.') }, [])
  useEffect(() => { load() }, [load])
  if (err) return <div className={`${card} mx-auto mt-10 max-w-md text-center`}>{err}</div>
  if (!d) return <div className="mt-20 text-center text-zinc-500">Loading your reports…</div>
  const total = d.clients.reduce((n, c) => n + c.reports, 0)

  return (
    <div className="pb-24 sm:pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-zinc-950 to-black p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-sky-300">Report kit</p>
        <h1 className="relative mt-2 text-3xl font-black leading-tight sm:text-4xl">Monthly reports your clients actually read.</h1>
        <p className="relative mt-2 max-w-xl text-sm text-zinc-400">One template per client. Each month, duplicate it, type the numbers (or drop in a CSV), add screenshots, and share one private link. Changes since last month show up on their own.</p>
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <button className={`${btnPrimary} gap-2 px-5 py-3 text-base`} onClick={() => setAdding(true)}><Plus size={18} />Add client</button>
          <span className="text-sm text-zinc-400">{d.clients.length} client{d.clients.length === 1 ? '' : 's'} · {total} report{total === 1 ? '' : 's'}</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Clients" className="space-y-3">
          {d.clients.length === 0 && <div className={`${card} text-center text-sm text-zinc-400`}>No clients yet. Add one to start their first monthly report.</div>}
          {d.clients.map((c) => (
            <Link key={c.id} href={`/reports/${c.id}`} className={`${card} flex items-center gap-3 transition hover:border-sky-300/40`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-200"><BarChart3 size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block text-xs text-zinc-400">{c.reports ? `${c.reports} report${c.reports === 1 ? '' : 's'} · latest ${monthLabel(c.latest!)}` : 'No reports yet'}{c.revoked ? ' · link off' : c.shared ? ` · ${c.shared} shared` : ''}{c.view_count ? ` · viewed ${c.view_count}×` : ''}</span>
              </span>
              <ChevronRight size={18} className="text-zinc-500" />
            </Link>
          ))}
        </section>
        <BrandCard d={d} setD={setD} toast={setToast} />
      </div>
      <AddClient open={adding} onClose={() => setAdding(false)} demo={d.demo} toast={setToast} onAdd={(c) => setD((x) => x && ({ ...x, clients: [{ ...c, reports: 0, shared: 0, latest: null }, ...x.clients] }))} />
      {toastEl}
    </div>
  )
}

function BrandCard({ d, setD, toast }: { d: Data; setD: (f: (x: Data | null) => Data | null) => void; toast: (s: string) => void }) {
  const [name, setName] = useState(d.brand.business_name || '')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  async function saveName() {
    if (d.demo) return toast(DEMO_NOTE)
    const r = await api('/api/reports/brand', 'PATCH', { business_name: name }); toast(r.ok ? 'Saved.' : r.data.error)
  }
  async function upload(f: File) {
    if (d.demo) return toast(DEMO_NOTE)
    if (f.size > 2 * 1024 * 1024) return toast('Logos can be up to 2 MB.')
    setBusy(true); const fd = new FormData(); fd.append('file', f)
    const r = await fetch('/api/reports/brand/logo', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok) return toast(j.error || 'Could not upload.')
    setD((x) => x && ({ ...x, brand: { ...x.brand, logo_url: j.logo_url } })); toast('Logo saved.')
  }
  async function removeLogo() {
    if (d.demo) return toast(DEMO_NOTE)
    const r = await api('/api/reports/brand/logo', 'DELETE'); if (!r.ok) return toast(r.data.error)
    setD((x) => x && ({ ...x, brand: { ...x.brand, logo_url: null } }))
  }
  return (
    <aside className={`${card} h-fit space-y-3`}>
      <h2 className="font-semibold">Your brand on reports</h2>
      <p className="text-xs text-zinc-400">Clients see your logo and name at the top of every report and PDF.</p>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {d.brand.logo_url ? <img src={d.brand.logo_url} alt="Your logo" className="h-14 w-14 rounded-xl bg-white object-contain p-1" /> : <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-white/20 text-zinc-500"><ImagePlus size={20} /></span>}
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Uploading…' : d.brand.logo_url ? 'Replace logo' : 'Upload logo'}</button>
          {d.brand.logo_url && <button className={btnGhost} aria-label="Remove logo" onClick={removeLogo}><Trash2 size={15} /></button>}
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f) }} />
      </div>
      <label className="block text-xs text-zinc-400">Business name<input className={`${input} mt-1`} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Uses your Invoices name if empty" /></label>
      <button className={btnGhost} onClick={saveName}>Save name</button>
    </aside>
  )
}

function AddClient({ open, onClose, demo, toast, onAdd }: { open: boolean; onClose: () => void; demo: boolean; toast: (s: string) => void; onAdd: (c: Client) => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (demo) { toast(DEMO_NOTE); onClose(); return }
    setBusy(true); const r = await api('/api/reports/clients', 'POST', { name, email: email || null }); setBusy(false)
    if (!r.ok) return toast(r.data.error)
    onAdd(r.data.client); setName(''); setEmail(''); onClose(); window.location.href = `/reports/${r.data.client.id}`
  }
  return (
    <Modal open={open} onClose={onClose} title="Add client">
      <form onSubmit={add} className="space-y-3">
        <label className="block text-sm">Client name<input className={`${input} mt-1`} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maple & Co Bakery" autoFocus /></label>
        <label className="block text-sm">Email (optional, only for your mail app)<input className={`${input} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@maple.co" /></label>
        <p className="text-xs text-zinc-500">They start with a ready-made template (visitors, leads, conversion, revenue, a chart, notes, two screenshots). You can change it any time.</p>
        <button className={`${btnPrimary} w-full py-3`} disabled={busy}>{busy ? 'Adding…' : 'Add client'}</button>
      </form>
    </Modal>
  )
}
