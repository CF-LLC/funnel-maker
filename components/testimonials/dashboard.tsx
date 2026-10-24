'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ACTIONS, actionsFor, LAYOUTS, photoSrc, settingsSchema, stars, STATUS_LABELS, STATUS_STYLES, type Layout, type Status } from '@/lib/testimonials/core'

type Row = { id: string; name: string; role: string | null; rating: number; body: string; photo_path: string | null; status: Status; created_at: string }
const ACTION_LABELS: Record<keyof typeof ACTIONS, string> = { approve: 'Approve', hide: 'Hide', unapprove: 'Unapprove', unhide: 'Unhide' }
const LAYOUT_LABELS: Record<Layout, string> = { none: 'Don’t show', grid: 'Grid', quote: 'Single quote' }

export function ReviewManager({ reviews }: { reviews: Row[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  async function act(id: string, a: keyof typeof ACTIONS) {
    setBusy(id); setError('')
    const { error } = await (createClient() as any).from('tst_reviews').update({ status: ACTIONS[a] }).eq('id', id)
    setBusy(null)
    if (error) return setError('Could not update the review. Check that Testimonials is still on your plan.')
    router.refresh()
  }
  const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium' })
  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border bg-background">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-4 p-4" data-review={r.status}>
            {r.photo_path
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoSrc(r.id)} alt="" className="h-12 w-12 rounded-full border object-cover" />
              : <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-semibold">{r.name.slice(0, 1).toUpperCase()}</span>}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.name}</span>{r.role && <span className="text-sm text-muted-foreground">{r.role}</span>}
                <span className="text-amber-500" aria-label={`${r.rating} out of 5 stars`}>{stars(r.rating)}</span>
                <span className={`rounded-full px-2 text-xs ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                <span className="text-xs text-muted-foreground">{when(r.created_at)}</span>
              </div>
              <p className="whitespace-pre-line text-sm">{r.body}</p>
            </div>
            <div className="flex gap-2">
              {actionsFor(r.status).map((a) => (
                <button key={a} type="button" disabled={busy === r.id} onClick={() => act(r.id, a)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${a === 'approve' ? 'bg-brand text-white' : 'border'}`}>{ACTION_LABELS[a]}</button>
              ))}
            </div>
          </li>
        ))}
        {!reviews.length && <li className="p-4 text-sm text-muted-foreground">No reviews here yet. Share your review link with clients.</li>}
      </ul>
    </div>
  )
}

export function SettingsForm({ initial, exists }: { initial: { accepting: boolean; linkinbio_layout: Layout; proposals_layout: Layout }; exists: boolean }) {
  const router = useRouter()
  const [s, setS] = useState(initial)
  const [msg, setMsg] = useState('')
  async function save() {
    setMsg('')
    const v = settingsSchema.safeParse(s)
    if (!v.success) return setMsg('Invalid settings')
    const db = createClient() as any
    const { data: { user } } = await db.auth.getUser()
    const row = { ...v.data, user_id: user?.id, updated_at: new Date().toISOString() }
    const { error } = exists ? await db.from('tst_settings').update(row).eq('user_id', user?.id) : await db.from('tst_settings').insert(row)
    setMsg(error ? 'Could not save settings' : 'Saved')
    if (!error) router.refresh()
  }
  const sel = (k: 'linkinbio_layout' | 'proposals_layout', label: string) => (
    <label className="flex items-center gap-2 text-sm">{label}
      <select className="rounded-lg border bg-background px-2 py-1" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value as Layout })}>
        {LAYOUTS.map((l) => <option key={l} value={l}>{LAYOUT_LABELS[l]}</option>)}
      </select></label>
  )
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-background p-4">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.accepting} onChange={(e) => setS({ ...s, accepting: e.target.checked })} />Accept new reviews</label>
      {sel('linkinbio_layout', 'On my Link-in-bio page:')}
      {sel('proposals_layout', 'On my proposals:')}
      <button type="button" onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Save</button>
      {msg && <span role="status" className="text-sm text-muted-foreground">{msg}</span>}
    </div>
  )
}
