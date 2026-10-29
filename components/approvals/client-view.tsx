'use client'
import { useState } from 'react'
import { api, btnGhost, btnPrimary, input } from '@/components/emaillist/ui'
import { STATUS_LABEL, vLabel, type Comment, type Version } from '@/lib/approvals/core'
import { CommentList } from './editor'
import { STATUS_BADGE } from './list'
import { Preview } from './preview'

export function ClientView({ token, latest, previewUrl, comments: init, clientName, demo }: { token: string; latest: Version; previewUrl: string | null; comments: Comment[]; clientName: string; demo: boolean }) {
  const [v, setV] = useState(latest)
  const [comments, setComments] = useState(init)
  const [name, setName] = useState(clientName)
  const [body, setBody] = useState(''), [note, setNote] = useState('')
  const [mode, setMode] = useState<null | 'changes'>(null)
  const [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const now = () => new Date().toISOString()

  async function comment() {
    setErr(''); setBusy(true)
    const r = await api('/api/approvals/public/comment', 'POST', { token, name, body })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    setComments([...comments, r.data.comment || { id: `demo-${comments.length}`, item_id: v.item_id, version_id: v.id, author: 'client', name, body, created_at: now() }])
    setBody(''); if (demo) setMsg('Demo: comments aren’t saved.')
  }
  async function decide(decision: 'approved' | 'changes') {
    setErr(''); setBusy(true)
    const r = await api('/api/approvals/public/decide', 'POST', { token, version_id: v.id, decision, name, note: decision === 'changes' ? note : '' })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    if (decision === 'changes' && note.trim()) setComments([...comments, { id: `n-${comments.length}`, item_id: v.item_id, version_id: v.id, author: 'client', name, body: note.trim(), created_at: now() }])
    setV({ ...v, status: decision, decided_name: name, decided_at: now() }); setMode(null)
    setMsg(demo ? 'Demo: answers aren’t saved.' : decision === 'approved' ? 'Thanks! Your approval has been recorded.' : 'Thanks! Your change request has been sent.')
  }
  const mine = comments.filter((c) => c.version_id === v.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-bold">{vLabel(v.number)}</span><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span></div>
      {v.note && <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200"><span className="text-zinc-500">What changed: </span>{v.note}</p>}
      <Preview v={v} url={previewUrl} />

      <section className="cine-glass space-y-4 rounded-2xl border border-white/10 p-4 sm:p-5">
        {v.status === 'waiting' ? (
          <>
            <h2 className="text-lg font-bold">Your answer</h2>
            <label className="block text-sm"><span className="text-zinc-400">Your name</span><input className={input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
            {mode === 'changes' ? (
              <div className="space-y-3">
                <label className="block text-sm"><span className="text-zinc-400">What would you like changed?</span><textarea className={input} rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></label>
                <div className="grid grid-cols-2 gap-2"><button className={btnGhost} onClick={() => setMode(null)}>Back</button><button className="rounded-full bg-rose-500 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={busy || !name.trim() || !note.trim()} onClick={() => decide('changes')}>Send changes</button></div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button className="rounded-full bg-emerald-400 px-4 py-3 text-base font-black text-black disabled:opacity-50" disabled={busy || !name.trim()} onClick={() => decide('approved')}>✓ Approve</button>
                <button className={`${btnGhost} py-3 text-base`} disabled={busy} onClick={() => setMode('changes')}>Request changes</button>
              </div>
            )}
          </>
        ) : (
          <p className="text-base">{v.status === 'approved' ? '✅ Approved' : '✏️ Changes requested'}{v.decided_name && <> by <b>{v.decided_name}</b></>}{v.decided_at && <span className="text-zinc-400"> · {new Date(v.decided_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}</p>
        )}
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
        {err && <p className="text-sm text-red-300">{err}</p>}
      </section>

      <section className="cine-glass space-y-3 rounded-2xl border border-white/10 p-4 sm:p-5">
        <h2 className="text-lg font-bold">Comments</h2>
        <CommentList comments={mine} clientLabel={clientName} />
        <textarea className={input} rows={3} maxLength={2000} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className={`${btnPrimary} w-full sm:w-auto`} disabled={busy || !body.trim()} onClick={comment}>Post comment</button>
      </section>
    </div>
  )
}
