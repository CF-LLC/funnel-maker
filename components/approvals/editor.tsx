'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, btnDanger, btnGhost, btnPrimary, card, fmtDate, input, Modal } from '@/components/emaillist/ui'
import { CopyBtn } from '@/components/portal/list'
import { createClient } from '@/lib/supabase'
import { ACCEPT, BUCKET, MAX_STORAGE_BYTES, STATUS_LABEL, approvalUrl, checkFile, fmtBytes, itemStatus, mailtoHref, objectPath, vLabel, type Comment, type Item, type Version } from '@/lib/approvals/core'
import { DEMO_PREVIEW } from '@/lib/approvals/demo'
import { ItemForm, STATUS_BADGE, statusText } from './list'
import { Preview } from './preview'

const DEMO = 'This is the demo account, so nothing is saved.'
const fmtTime = (d: string) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function CommentList({ comments, clientLabel }: { comments: Comment[]; clientLabel?: string }) {
  if (!comments.length) return <p className="text-sm text-zinc-500">No comments yet.</p>
  return (
    <ul className="space-y-2">
      {comments.map((c) => (
        <li key={c.id} className={`rounded-xl border p-3 text-sm ${c.author === 'client' ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-white/10 bg-white/5'}`}>
          <div className="flex justify-between gap-2 text-xs text-zinc-400"><span className="font-semibold text-zinc-200">{c.author === 'client' ? c.name || clientLabel || 'Client' : 'You'}</span><span>{fmtTime(c.created_at)}</span></div>
          <p className="mt-1 whitespace-pre-wrap break-words text-zinc-200">{c.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function ItemEditor({ demo, userId, item, versions: initV, comments: initC, usedBytes }: { demo: boolean; userId: string; item: Item; versions: Version[]; comments: Comment[]; usedBytes: number }) {
  const router = useRouter()
  const [it, setIt] = useState(item)
  const [versions, setVersions] = useState(initV)
  const [comments, setComments] = useState(initC)
  const [modal, setModal] = useState<null | 'version' | 'edit' | 'settings'>(null)
  const [selected, setSelected] = useState<string | null>(initV[0]?.id || null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<'file' | 'video'>('file')
  const [file, setFile] = useState<File | null>(null), [video, setVideo] = useState(''), [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const v = versions.find((x) => x.id === selected) || versions[0] || null
  const latest = versions[0] || null
  const status = itemStatus(versions)
  const url = approvalUrl(it.token)

  useEffect(() => {
    setFileUrl(null)
    if (!v || v.kind !== 'file') return
    if (demo) { setFileUrl(DEMO_PREVIEW); return }
    let live = true
    api(`/api/approvals/file?id=${v.id}`, 'GET').then((r) => { if (live && r.ok) setFileUrl(r.data.url) })
    return () => { live = false }
  }, [v, demo])

  async function run(fn: () => Promise<{ ok: boolean; data: any }>, after?: (d: any) => void) {
    setErr(''); setMsg('')
    if (demo) return setErr(DEMO)
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Something went wrong.')
    after?.(r.data)
  }
  async function addVersion() {
    setErr('')
    if (demo) return setErr(DEMO)
    if (kind === 'video') return run(() => api('/api/approvals/versions', 'POST', { item_id: it.id, kind: 'video', video_url: video, note }), done)
    if (!file) return setErr('Pick a file.')
    const chk = checkFile(file.name, file.size, usedBytes)
    if (!chk.ok) return setErr(chk.error)
    setBusy(true)
    const path = objectPath(userId, it.id, file.name, crypto.randomUUID().slice(0, 8))
    const { error } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: chk.mime, upsert: false })
    setBusy(false)
    if (error) return setErr('Upload failed. Try again.')
    return run(() => api('/api/approvals/versions', 'POST', { item_id: it.id, kind: 'file', path, name: file.name, note }), done)
  }
  function done(d: { version: Version }) {
    setVersions([d.version, ...versions]); setSelected(d.version.id)
    setModal(null); setFile(null); setVideo(''); setNote('')
    setMsg(`${vLabel(d.version.number)} is up. Your client sees it next time they open the link.`)
  }

  return (
    <div className="space-y-5">
      <Link href="/approvals" className="text-sm text-zinc-400 hover:underline">← All items</Link>
      <section className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{it.title}</h1>
            <p className="text-sm text-zinc-400">For {it.client_name}{latest && ` · latest ${vLabel(latest.number)}`}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm ${STATUS_BADGE[status]}`}>{statusText(status)}</span>
        </div>
        {latest && latest.status !== 'waiting' && latest.decided_name && <p className="text-sm text-zinc-300">{latest.status === 'approved' ? '✅ Approved' : '✏️ Changes requested'} by <b>{latest.decided_name}</b> on {fmtTime(latest.decided_at!)}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => setModal('version')}>+ New version</button>
          {!it.revoked && latest && <CopyBtn text={url} />}
          {!it.revoked && latest && <a className={btnGhost} href={mailtoHref(it.client_name, it.client_email, it.title, url)}>Email from my app</a>}
          <button className={btnGhost} onClick={() => setModal('settings')}>Link &amp; settings</button>
        </div>
        {!latest && <p className="text-sm text-zinc-400">Upload v1 (PDF or image) or paste a video link, then share the private link.</p>}
        {it.revoked && <p className="text-sm text-red-300">The client link is turned off.</p>}
        <p className="text-xs text-zinc-500">{it.last_viewed_at ? `Client last viewed ${fmtDate(it.last_viewed_at)} · ${it.view_count} views` : 'Client hasn’t opened the link yet'} · Storage {fmtBytes(usedBytes)} of {fmtBytes(MAX_STORAGE_BYTES)}</p>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
        {err && !modal && <p className="text-sm text-red-300">{err}</p>}
      </section>

      {v && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{vLabel(v.number)}</h2><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span>{v.id !== latest?.id && <span className="text-xs text-zinc-500">older version (client only sees the latest)</span>}</div>
            {v.note && <p className="text-sm text-zinc-300">{v.note}</p>}
            <Preview v={v} url={fileUrl} />
          </section>
          <aside className="space-y-4">
            <div className={`${card} space-y-2`}>
              <h3 className="font-bold">Versions</h3>
              <ul className="space-y-1">
                {versions.map((x) => (
                  <li key={x.id}>
                    <button onClick={() => setSelected(x.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${x.id === v.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                      <span className="min-w-0"><b>{vLabel(x.number)}</b> <span className="text-zinc-500">· {fmtDate(x.created_at)}</span>{x.decided_name && <span className="block truncate text-xs text-zinc-500">{x.decided_name}, {fmtTime(x.decided_at!)}</span>}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[x.status]}`}>{STATUS_LABEL[x.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${card} space-y-3`}>
              <h3 className="font-bold">Comments on {vLabel(v.number)}</h3>
              <CommentList comments={comments.filter((c) => c.version_id === v.id)} clientLabel={it.client_name} />
              <textarea className={input} rows={2} maxLength={2000} placeholder="Reply to your client…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className={`${btnGhost} w-full`} disabled={busy || !reply.trim()} onClick={() => run(() => api('/api/approvals/comments', 'POST', { item_id: it.id, version_id: v.id, body: reply }), (d) => { setComments([...comments, d.comment]); setReply('') })}>Post reply</button>
            </div>
          </aside>
        </div>
      )}

      <Modal open={modal === 'version'} onClose={() => setModal(null)} title={`New version (${vLabel((latest?.number || 0) + 1)})`}>
        <div className="space-y-3">
          <div className="flex gap-2">{(['file', 'video'] as const).map((k) => <button key={k} type="button" className={kind === k ? btnPrimary : btnGhost} onClick={() => setKind(k)}>{k === 'file' ? 'PDF or image' : 'Video link'}</button>)}</div>
          {kind === 'file'
            ? <label className="block text-sm"><span className="text-zinc-400">PDF, PNG, JPG or WEBP, up to 25 MB</span><input className={input} type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
            : <label className="block text-sm"><span className="text-zinc-400">YouTube, Vimeo, Loom or any https link (we don’t host video)</span><input className={input} inputMode="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.loom.com/share/…" /></label>}
          <label className="block text-sm"><span className="text-zinc-400">What changed? (optional, the client sees this)</span><textarea className={input} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button className={`${btnPrimary} w-full`} disabled={busy || (kind === 'file' ? !file : !video.trim())} onClick={addVersion}>{busy ? 'Uploading…' : 'Post version'}</button>
        </div>
      </Modal>
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit item">
        <ItemForm initial={it} busy={busy} err={err} label="Save" submit={(val) => run(() => api(`/api/approvals/items/${it.id}`, 'PATCH', val), (d) => { setIt(d.item); setModal(null) })} />
      </Modal>
      <Modal open={modal === 'settings'} onClose={() => setModal(null)} title="Link & settings">
        <div className="space-y-3 text-sm">
          <p className="break-all rounded-xl bg-white/5 p-3 text-xs text-zinc-300">{url}</p>
          <p className="text-zinc-400">Anyone with this link can see the latest version, comment and answer. No login needed.</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => setModal('edit')}>Edit details</button>
            <button className={btnGhost} disabled={busy} onClick={() => run(() => api(`/api/approvals/items/${it.id}`, 'PATCH', { revoked: !it.revoked }), (d) => setIt(d.item))}>{it.revoked ? 'Turn link back on' : 'Turn link off'}</button>
            <button className={btnGhost} disabled={busy} onClick={() => run(() => api(`/api/approvals/items/${it.id}/regenerate`, 'POST'), (d) => { setIt(d.item); setMsg('New link made. The old one no longer works.') })}>New link</button>
            <button className={btnDanger} disabled={busy} onClick={() => { if (demo || confirm('Delete this item, every version and all comments? This can’t be undone.')) run(() => api(`/api/approvals/items/${it.id}`, 'DELETE'), () => router.push('/approvals')) }}>Delete</button>
          </div>
          {err && <p className="text-red-300">{err}</p>}
        </div>
      </Modal>
    </div>
  )
}
