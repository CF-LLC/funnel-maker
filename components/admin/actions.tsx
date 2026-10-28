'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

type Pending = { title: string; body: string; danger?: boolean; url: string; payload: Record<string, unknown> }

function useConfirm(preview: boolean) {
  const router = useRouter()
  const [p, setP] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const run = async () => {
    if (!p) return
    if (preview) { setP(null); setMsg('Preview only, nothing changed.'); return }
    setBusy(true); setMsg(null)
    const r = await fetch(p.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.payload) }).catch(() => null)
    const j = r ? await r.json().catch(() => ({})) : {}
    setBusy(false); setP(null)
    if (r?.ok) { setMsg('Done. Logged to the audit trail.'); router.refresh() } else setMsg(j.error || 'Something went wrong')
  }
  const dialog = p && (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center" onKeyDown={(e) => e.key === 'Escape' && setP(null)}>
      <div className="w-full max-w-md rounded-2xl bg-[#16161c] p-5 ring-1 ring-white/15">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${p.danger ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}><AlertTriangle className="h-4 w-4" /></span>
          <div><h3 id="confirm-title" className="font-bold">{p.title}</h3><p className="mt-1 text-sm text-zinc-400">{p.body}</p></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button autoFocus onClick={() => setP(null)} className="min-h-[40px] rounded-full px-4 text-sm font-semibold ring-1 ring-white/15">Cancel</button>
          <button disabled={busy} onClick={run} className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-semibold ${p.danger ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirm</button>
        </div>
      </div>
    </div>
  )
  return { ask: setP, dialog, msg }
}

const btn = 'min-h-[36px] rounded-full px-3 text-xs font-semibold ring-1 transition'

export function AccessControls({ userId, label, tools, active, suspended, self, preview = false }: { userId: string; label: string; tools: { id: string; name: string }[]; active: string[]; suspended: boolean; self: boolean; preview?: boolean }) {
  const { ask, dialog, msg } = useConfirm(preview)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tools.map((t) => {
          const on = active.includes(t.id)
          return (
            <button key={t.id} onClick={() => ask({ title: `${on ? 'Revoke' : 'Grant'} ${t.name}?`, body: `${on ? 'Turns off' : 'Turns on'} ${t.name} for ${label}. ${on ? 'Their data stays; they just lose access.' : 'Granted as manual (comped) access.'}`, danger: on, url: '/api/admin/actions', payload: { action: on ? 'revoke' : 'grant', userId, tool: t.id } })}
              className={`${btn} flex items-center justify-between gap-2 !rounded-xl px-3 py-2 text-left ${on ? 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30' : 'bg-white/[0.03] text-zinc-300 ring-white/10 hover:ring-white/30'}`}>
              <span>{t.name}</span><span className="text-[10px] uppercase opacity-70">{on ? 'On' : 'Off'}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!self && (suspended
          ? <button onClick={() => ask({ title: 'Unsuspend this account?', body: `${label} can sign in again.`, url: '/api/admin/actions', payload: { action: 'unsuspend', userId } })} className={`${btn} bg-white text-black ring-white`}>Unsuspend</button>
          : <button onClick={() => ask({ title: 'Suspend this account?', body: `${label} is signed out and can't sign in until you unsuspend. Nothing is deleted.`, danger: true, url: '/api/admin/actions', payload: { action: 'suspend', userId } })} className={`${btn} bg-rose-600/90 text-white ring-rose-400/40`}>Suspend</button>)}
        {msg && <span role="status" className="text-xs text-zinc-400">{msg}</span>}
      </div>
      {dialog}
    </div>
  )
}

export function FlagToggles({ flags, preview = false }: { flags: { key: string; enabled: boolean; description: string | null }[]; preview?: boolean }) {
  const { ask, dialog, msg } = useConfirm(preview)
  return (
    <div className="space-y-2">
      {flags.map((f) => (
        <div key={f.key} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
          <div className="min-w-0 flex-1"><div className="font-mono text-sm font-semibold">{f.key}</div>{f.description && <div className="text-xs text-zinc-400">{f.description}</div>}</div>
          <button role="switch" aria-checked={f.enabled} aria-label={`${f.key} ${f.enabled ? 'on' : 'off'}`}
            onClick={() => ask({ title: `Turn ${f.key} ${f.enabled ? 'off' : 'on'}?`, body: f.key === 'crm_public' && !f.enabled ? 'Client list (CRM) appears on home, pricing and the dashboard within about a minute. CRM pricing still needs your OK and has no Stripe links yet.' : 'Takes effect within about a minute.', danger: !f.enabled, url: '/api/admin/flags', payload: { key: f.key, enabled: !f.enabled } })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${f.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${f.enabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      ))}
      {msg && <p role="status" className="text-xs text-zinc-400">{msg}</p>}
      {dialog}
    </div>
  )
}
