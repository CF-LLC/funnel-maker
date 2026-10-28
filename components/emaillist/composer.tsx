'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { recipientsFor, renderBroadcast, type Broadcast, type Settings } from '@/lib/emaillist/core'
import { Modal, api, btnDanger, btnGhost, btnPrimary, card, input } from './ui'

type Props = { initial: Broadcast; settings: Settings; audience: { tags: string[] }[]; sentToday: number; demo: boolean; platformSending: boolean; ownEmail: string }

export function Composer({ initial, settings, audience, sentToday, demo, platformSending, ownEmail }: Props) {
  const router = useRouter()
  const [b, setB] = useState(initial)
  const [view, setView] = useState<'phone' | 'desktop'>('phone')
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [sendOpen, setSendOpen] = useState(false); const [confirmText, setConfirmText] = useState('')
  const draft = b.status === 'draft'
  const tags = useMemo(() => [...new Set(audience.flatMap((a) => a.tags))].sort(), [audience])
  const count = recipientsFor(audience.map((a) => ({ ...a, status: 'subscribed' as const })), b.tag).length
  const html = useMemo(() => renderBroadcast(b, settings, '#unsubscribe-preview').html, [b, settings])
  const set = (k: keyof Broadcast, v: string | null) => { setB({ ...b, [k]: v }); setMsg('') }
  const realReady = !demo && settings.sending_enabled && platformSending && !!settings.from_name && !!settings.mailing_address
  const overCap = sentToday + count > settings.daily_cap

  async function save(quiet = false) {
    setErr('')
    if (demo) { if (!quiet) setMsg('Demo account: changes aren’t saved.'); return true }
    setBusy(true); const r = await api(`/api/emaillist/broadcasts/${b.id}`, 'PATCH', b); setBusy(false)
    if (!r.ok) { setErr(r.data.error || 'Could not save.'); return false }
    if (!quiet) setMsg('Draft saved.'); return true
  }
  async function test() {
    if (!(await save(true))) return
    setBusy(true); const r = await api(`/api/emaillist/broadcasts/${b.id}/test`, 'POST'); setBusy(false)
    if (r.ok) setMsg(`Test sent to ${r.data.to}.`); else setErr(r.data.error || 'Test not sent.')
  }
  async function send() {
    setErr('')
    if (!(await save(true))) return
    setBusy(true); const r = await api(`/api/emaillist/broadcasts/${b.id}/send`, 'POST', { confirm: confirmText }); setBusy(false)
    if (!r.ok) { setErr(r.data.error || 'Not sent.'); return }
    setSendOpen(false); router.push('/email-list/broadcasts'); router.refresh()
  }
  async function del() {
    if (demo) return setMsg('Demo account: changes aren’t saved.')
    if (!confirm('Delete this draft?')) return
    const r = await api(`/api/emaillist/broadcasts/${b.id}`, 'DELETE'); if (r.ok) router.push('/email-list/broadcasts')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Link href="/email-list/broadcasts" className="text-sm text-zinc-400 hover:underline">← Broadcasts</Link>{!draft && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-200">{b.status} · {b.sent_count} delivered</span>}</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,420px)]">
        <div className={`${card} space-y-3`}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Subject
            <input className={`${input} mt-1 text-base`} value={b.subject} disabled={!draft} maxLength={200} onChange={(e) => set('subject', e.target.value)} placeholder="What’s this email about?" /></label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview text
            <input className={`${input} mt-1`} value={b.preheader} disabled={!draft} maxLength={200} onChange={(e) => set('preheader', e.target.value)} placeholder="Shown next to the subject in the inbox" /></label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Message
            <textarea className={`${input} mt-1 h-72 font-mono leading-relaxed`} value={b.body} disabled={!draft} onChange={(e) => set('body', e.target.value)} placeholder={'Hi friend,\n\nWrite like you talk. **bold**, *italic*, [a link](https://…), - bullet lists and # headings work.'} /></label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Send to
            <select className={`${input} mt-1`} value={b.tag || ''} disabled={!draft} onChange={(e) => set('tag', e.target.value || null)}>
              <option value="">Everyone subscribed</option>{tags.map((t) => <option key={t} value={t}>Only #{t}</option>)}
            </select></label>
          <p className="text-sm text-zinc-300"><b>{count}</b> {count === 1 ? 'person' : 'people'} will get this · {sentToday}/{settings.daily_cap} sent in the last 24h</p>
          {msg && <p role="status" className="text-sm text-cyan-200">{msg}</p>}
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          {draft && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button className={btnGhost} onClick={() => save()} disabled={busy}>Save draft</button>
              <button className={btnGhost} onClick={test} disabled={busy || !realReady} title={realReady ? `Sends only to ${ownEmail}` : 'Real sending is off'}>Send test to me</button>
              <button className={btnPrimary} onClick={() => { setConfirmText(''); setErr(''); setSendOpen(true) }} disabled={busy}>Send…</button>
              <button className="ml-auto text-sm text-red-400 hover:underline" onClick={del}>Delete</button>
            </div>
          )}
          {draft && !realReady && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{demo ? 'Demo account: nothing is ever sent.' : !settings.from_name || !settings.mailing_address ? 'Add your sender name and mailing address in Settings before you can send.' : !settings.sending_enabled ? 'Demo mode is on (Settings), so nothing is sent. You can still write, preview and save.' : 'Sending isn’t switched on for SaaS Nation yet. You can still write, preview and save.'}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview</span>
            <div className="flex rounded-full border border-white/10 p-0.5 text-xs">{(['phone', 'desktop'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 capitalize ${view === v ? 'bg-white text-black' : 'text-zinc-300'}`}>{v}</button>)}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-2 text-sm"><div className="truncate font-semibold">{settings.from_name || 'Your name'}</div><div className="truncate">{b.subject || 'Subject'}</div><div className="truncate text-xs text-zinc-500">{b.preheader}</div></div>
          <div className={`mx-auto overflow-hidden rounded-[2rem] border-4 border-zinc-800 bg-black shadow-2xl shadow-cyan-900/20 transition-all ${view === 'phone' ? 'max-w-[360px]' : 'max-w-full'}`}>
            <iframe title="Email preview" sandbox="" srcDoc={html} className="h-[560px] w-full bg-white" />
          </div>
        </div>
      </div>
      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title="Send this broadcast?">
        <div className="space-y-3 text-sm">
          <p>“{b.subject || 'Untitled'}” goes to <b>{count}</b> {count === 1 ? 'person' : 'people'}{b.tag ? ` tagged #${b.tag}` : ''}. This can’t be undone.</p>
          <ul className="space-y-1 text-zinc-300">
            <li>{settings.from_name && settings.mailing_address ? '✓' : '✗'} Sender name and mailing address in the footer</li>
            <li>✓ One-click unsubscribe link in every email</li>
            <li>{overCap ? '✗' : '✓'} Within your daily limit ({sentToday + count}/{settings.daily_cap})</li>
            <li>{realReady ? '✓' : '✗'} Real sending on</li>
          </ul>
          <label className="block">Type <b>SEND</b> to confirm<input className={`${input} mt-1`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" /></label>
          {err && <p role="alert" className="text-red-400">{err}</p>}
          <button className={`${btnDanger} w-full`} disabled={busy || confirmText !== 'SEND'} onClick={send}>{busy ? 'Sending…' : `Send to ${count}`}</button>
        </div>
      </Modal>
    </div>
  )
}
