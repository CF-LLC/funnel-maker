'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { pct, type Broadcast } from '@/lib/emaillist/core'
import { api, btnPrimary, card, fmtDate } from './ui'

const BADGE: Record<Broadcast['status'], string> = { draft: 'bg-zinc-700 text-zinc-200', sending: 'bg-amber-500/20 text-amber-200', sent: 'bg-emerald-500/20 text-emerald-200', failed: 'bg-red-500/20 text-red-200' }

export function BroadcastList({ broadcasts, unsubs, demo }: { broadcasts: Broadcast[]; unsubs: Record<string, number>; demo: boolean }) {
  const router = useRouter(); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function create() {
    if (demo) return router.push('/email-list/broadcasts/demo-2')
    setBusy(true); const r = await api('/api/emaillist/broadcasts', 'POST'); setBusy(false)
    if (r.ok) router.push(`/email-list/broadcasts/${r.data.id}`); else setErr(r.data.error || 'Could not create a draft.')
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Broadcasts</h1><p className="text-sm text-zinc-400">One email to everyone on your list, or to one tag.</p></div>
        <button className={btnPrimary} onClick={create} disabled={busy}>+ New broadcast</button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {broadcasts.length === 0 ? (
        <div className={`${card} py-12 text-center`}><p className="text-lg font-semibold">No broadcasts yet</p><p className="mt-1 text-sm text-zinc-400">Write your first email. Nothing is sent until you press Send and type SEND.</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {broadcasts.map((b) => (
            <Link key={b.id} href={`/email-list/broadcasts/${b.id}`} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#16162a] to-[#0d1418] p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/40">
              <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE[b.status]}`}>{b.status}</span>{b.tag && <span className="text-xs text-zinc-400">#{b.tag}</span>}<span className="ml-auto text-xs text-zinc-500">{fmtDate(b.sent_at || b.updated_at)}</span></div>
              <h2 className="mt-2 truncate text-lg font-bold group-hover:text-cyan-200">{b.subject || 'Untitled draft'}</h2>
              <p className="truncate text-sm text-zinc-400">{b.preheader || b.body.slice(0, 90) || 'No message yet'}</p>
              {b.status !== 'draft' && <p className="mt-2 text-xs text-zinc-400">{b.sent_count} delivered{b.failed_count ? ` · ${b.failed_count} failed` : ''} · {unsubs[b.id] || 0} unsubscribed ({pct(unsubs[b.id] || 0, b.sent_count)})</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
