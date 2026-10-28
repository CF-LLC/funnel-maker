'use client'
import { useState } from 'react'
import { orderState, type Order } from '@/lib/dlstore/core'
import { api, card, fmtDate } from '@/components/emaillist/ui'

const BADGE = { ok: 'bg-emerald-500/20 text-emerald-200', revoked: 'bg-red-500/20 text-red-200', expired: 'bg-zinc-600/40 text-zinc-300', used: 'bg-amber-500/20 text-amber-100' } as const
const LABEL = { ok: 'Active', revoked: 'Turned off', expired: 'Expired', used: 'All used' } as const
export function OrdersView({ initial, products, demo }: { initial: Order[]; products: { id: string; title: string }[]; demo: boolean }) {
  const [orders, setOrders] = useState(initial); const [err, setErr] = useState('')
  const name = (id: string) => products.find((p) => p.id === id)?.title || 'Deleted product'
  async function toggle(o: Order) {
    setErr(''); if (demo) return setErr('Demo account: nothing is saved.')
    const r = await api(`/api/downloads/orders/${o.id}`, 'PATCH', { revoked: !o.revoked })
    if (r.ok) setOrders((x) => x.map((y) => (y.id === o.id ? r.data.order : y))); else setErr(r.data.error || 'Could not change it.')
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Orders</h1>
        <p className="mt-1 text-sm text-zinc-400">Each row is a buyer who unlocked files through your thank-you link or access code. Check payments in your own Stripe dashboard; turn off any link that looks shared.</p></div>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      {orders.length === 0 ? <div className={`${card} text-center text-sm text-zinc-400`}>No orders yet.</div> : (
        <ul className="space-y-2">
          {orders.map((o) => { const s = orderState(o); return (
            <li key={o.id} className={`${card} flex flex-wrap items-center gap-x-4 gap-y-1`}>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{name(o.product_id)}</div>
                <div className="truncate text-xs text-zinc-400">{o.buyer_email || 'No email given'} · {o.via === 'code' ? 'Access code' : 'Thank-you link'} · {fmtDate(o.created_at)}</div></div>
              <div className="text-xs text-zinc-400">{o.downloads}/{o.max_downloads} downloads</div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[s]}`}>{LABEL[s]}</span>
              <button className="text-xs text-zinc-300 hover:underline" onClick={() => toggle(o)}>{o.revoked ? 'Turn back on' : 'Turn off'}</button>
            </li>) })}
        </ul>
      )}
    </div>
  )
}
