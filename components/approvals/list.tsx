'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, btnGhost, btnPrimary, card, fmtDate, input, Modal, Stat } from '@/components/emaillist/ui'
import { CopyBtn } from '@/components/portal/list'
import { STATUS_LABEL, approvalUrl, mailtoHref, vLabel } from '@/lib/approvals/core'
import type { ItemRow } from '@/lib/approvals/load'

export const STATUS_BADGE = { waiting: 'bg-amber-500/15 text-amber-300', changes: 'bg-rose-500/15 text-rose-300', approved: 'bg-emerald-500/15 text-emerald-300', empty: 'bg-zinc-500/20 text-zinc-300' } as const
export const statusText = (s: ItemRow['status']) => (s === 'empty' ? 'No version yet' : STATUS_LABEL[s])

export function ItemForm({ initial, busy, err, submit, label }: { initial?: Partial<{ title: string; client_name: string; client_email: string | null }>; busy: boolean; err: string; submit: (v: Record<string, string>) => void; label: string }) {
  const [v, setV] = useState({ title: initial?.title || '', client_name: initial?.client_name || '', client_email: initial?.client_email || '' })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <div className="space-y-3">
      <label className="block text-sm"><span className="text-zinc-400">What needs approving?</span><input className={input} value={v.title} onChange={set('title')} maxLength={120} placeholder="Homepage mockup" /></label>
      <label className="block text-sm"><span className="text-zinc-400">Client name</span><input className={input} value={v.client_name} onChange={set('client_name')} maxLength={120} /></label>
      <label className="block text-sm"><span className="text-zinc-400">Client email (optional, only for your own mail app)</span><input className={input} type="email" value={v.client_email} onChange={set('client_email')} /></label>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button className={`${btnPrimary} w-full`} disabled={busy || !v.title.trim() || !v.client_name.trim()} onClick={() => submit(v)}>{busy ? 'Saving…' : label}</button>
    </div>
  )
}

export function ItemList({ demo, items }: { demo: boolean; items: ItemRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const n = (s: ItemRow['status']) => items.filter((i) => i.status === s).length
  async function create(v: Record<string, string>) {
    setErr('')
    if (demo) return setErr('This is the demo account, so nothing is saved.')
    setBusy(true)
    const r = await api('/api/approvals/items', 'POST', v)
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    router.push(`/approvals/${r.data.item.id}`)
  }
  return (
    <div className="space-y-6">
      <section className="cine-hero relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-[#0b1a14] to-black p-6 sm:p-8">
        <div className="cine-rise relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Approval link</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Get a clear yes on your work.</h1>
          <p className="mt-2 max-w-xl text-zinc-300">Upload a draft or paste a video link, send one private link, and your client comments, then taps Approve or Request changes. Every version is kept as v1, v2, v3.</p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setOpen(true)}>+ New item</button>
        </div>
      </section>
      <div className="grid grid-cols-3 gap-3"><Stat label="Waiting" value={n('waiting')} /><Stat label="Changes requested" value={n('changes')} /><Stat label="Approved" value={n('approved')} /></div>
      {items.length === 0 ? (
        <div className={`${card} text-center text-zinc-400`}>Nothing yet. Add an item and upload the first version.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((i) => {
            const url = approvalUrl(i.token)
            return (
              <li key={i.id} className={`${card} space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Link href={`/approvals/${i.id}`} className="block truncate text-lg font-bold hover:underline">{i.title}</Link><div className="truncate text-sm text-zinc-400">{i.client_name}{i.latest > 0 && ` · ${vLabel(i.latest)}`}</div></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[i.status]}`}>{statusText(i.status)}</span>
                </div>
                <div className="text-xs text-zinc-500">{i.revoked ? 'Link turned off' : i.last_viewed_at ? `Last viewed ${fmtDate(i.last_viewed_at)} · ${i.view_count} views` : 'Not opened yet'}{i.comments > 0 && ` · ${i.comments} client comment${i.comments === 1 ? '' : 's'}`}</div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/approvals/${i.id}`} className={btnPrimary}>Open</Link>
                  {!i.revoked && i.latest > 0 && <CopyBtn text={url} />}
                  {!i.revoked && i.latest > 0 && <a className={btnGhost} href={mailtoHref(i.client_name, i.client_email, i.title, url)}>Email from my app</a>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New item"><ItemForm busy={busy} err={err} submit={create} label="Create item" /></Modal>
    </div>
  )
}
