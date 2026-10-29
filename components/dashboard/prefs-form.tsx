'use client'
import { useState } from 'react'

type Prefs = { weekly_digest: boolean; new_lead_alerts: boolean; product_updates: boolean }
const ROWS: { k: keyof Prefs; label: string; hint: string }[] = [
  { k: 'weekly_digest', label: 'Weekly digest', hint: 'A Monday summary of leads, bookings, responses and paid invoices.' },
  { k: 'new_lead_alerts', label: 'New lead alerts', hint: 'An email when someone fills in one of your funnels or forms.' },
  { k: 'product_updates', label: 'New tools and product news', hint: 'About one short email per new tool.' },
]

export function PrefsForm({ initial }: { initial: Prefs }) {
  const [p, setP] = useState(initial)
  const [msg, setMsg] = useState('')
  async function toggle(k: keyof Prefs) {
    const next = { ...p, [k]: !p[k] }
    setP(next); setMsg('Saving…')
    const r = await fetch('/api/me/prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [k]: next[k] }) }).catch(() => null)
    if (r?.ok) setMsg('Saved.')
    else { setP(p); setMsg('Could not save. Try again.') }
  }
  return (
    <div>
      <ul className="divide-y divide-white/10">
        {ROWS.map((r) => (
          <li key={r.k} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{r.label}</div><div className="text-xs text-zinc-400">{r.hint}</div></div>
            <button role="switch" aria-checked={p[r.k]} aria-label={r.label} onClick={() => toggle(r.k)} data-pref={r.k} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${p[r.k] ? 'bg-violet-500' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${p[r.k] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 min-h-[1rem] text-xs text-zinc-400" role="status">{msg}</p>
    </div>
  )
}
