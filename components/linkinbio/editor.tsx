'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageInput } from '@/components/uploads/image-input'
import { DownloadQr } from '@/components/qr/download-qr'
import { linkSchema, MAX_LINKS, profileSchema, publicPath, SOCIALS, THEMES, type Theme } from '@/lib/linkinbio/core'

type Profile = { handle: string; display_name: string; bio: string; avatar_url: string | null; show_funnels: boolean; published: boolean; theme: Theme; socials: Record<string, string>; hide_badge: boolean }
type LinkRow = { id: string; title: string; url: string; position: number; clicks: number }

export function LinkInBioEditor({ userId, initialProfile, initialLinks, canHideBadge, quickAdd, demo = false }: {
  demo?: boolean; userId: string; initialProfile: Profile | null; initialLinks: LinkRow[]; canHideBadge: boolean; quickAdd: { title: string; path: string }[]
}) {
  const supabase = createClient()
  const [p, setP] = useState<Profile>(initialProfile ?? { handle: '', display_name: '', bio: '', avatar_url: '', show_funnels: true, published: true, theme: 'light', socials: {}, hide_badge: false })
  const [saved, setSaved] = useState(!!initialProfile)
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [msg, setMsg] = useState('')
  const [nl, setNl] = useState({ title: '', url: '' })

  async function saveProfile() {
    setMsg('')
    const r = profileSchema.safeParse({ ...p, avatar_url: p.avatar_url || '', socials: p.socials || {}, hide_badge: canHideBadge && p.hide_badge })
    if (!r.success) return setMsg(r.error.issues[0]?.message || 'Check the fields')
    const { error } = await (supabase as any).from('lib_profiles').upsert({ user_id: userId, ...r.data, updated_at: new Date().toISOString() })
    if (error) return setMsg(error.code === '23505' ? 'That handle is taken' : error.message)
    setP({ ...p, handle: r.data.handle }); setSaved(true); setMsg('Saved')
  }

  async function addLink(input = nl) {
    setMsg('')
    if (links.length >= MAX_LINKS) return setMsg(`Up to ${MAX_LINKS} links`)
    const r = linkSchema.safeParse(input)
    if (!r.success) return setMsg(r.error.issues[0]?.message || 'Check the link')
    const position = links.length ? Math.max(...links.map((l) => l.position)) + 1 : 0
    const { data, error } = await (supabase as any).from('lib_links').insert({ user_id: userId, ...r.data, position }).select().single()
    if (error) return setMsg(error.message.includes('lib_link_limit') ? `Up to ${MAX_LINKS} links` : error.message)
    setLinks([...links, data]); setNl({ title: '', url: '' })
  }

  async function updateLink(l: LinkRow) {
    const r = linkSchema.safeParse(l)
    if (!r.success) return setMsg(r.error.issues[0]?.message || 'Check the link')
    const { error } = await (supabase as any).from('lib_links').update(r.data).eq('id', l.id)
    setMsg(error ? error.message : 'Saved')
  }

  async function move(i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= links.length) return
    const next = [...links]; [next[i], next[j]] = [next[j], next[i]]
    const renum = next.map((l, k) => ({ ...l, position: k }))
    setLinks(renum)
    await Promise.all(renum.map((l) => (supabase as any).from('lib_links').update({ position: l.position }).eq('id', l.id)))
  }

  async function remove(id: string) {
    if (!confirm('Remove this link?')) return
    const { error } = await (supabase as any).from('lib_links').delete().eq('id', id)
    if (!error) setLinks(links.filter((l) => l.id !== id))
  }

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value })

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Profile</h2>
          {saved && p.handle && <Link href={publicPath(p.handle)} target="_blank" className="text-sm text-primary hover:underline">View {publicPath(p.handle)} ↗</Link>}
        </div>
        {saved && p.handle && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2"><DownloadQr path={publicPath(p.handle)} label="QR for your page" /><span className="text-xs text-muted-foreground">Print it on cards, flyers or a table sign.</span></div>}
        <div><Label htmlFor="h">Handle</Label><Input id="h" value={p.handle} onChange={set('handle')} placeholder="yourname" /></div>
        <div><Label htmlFor="n">Name</Label><Input id="n" value={p.display_name} onChange={set('display_name')} maxLength={60} /></div>
        <div><Label htmlFor="b">Bio</Label><Textarea id="b" value={p.bio} onChange={set('bio')} maxLength={160} rows={2} /></div>
        <ImageInput id="a" label="Avatar" kind="avatar" round demo={demo} value={p.avatar_url || ''} onChange={(url) => setP({ ...p, avatar_url: url })} />
        <div><Label>Theme</Label>
          <div className="flex gap-2">{THEMES.map((t) => <Button key={t} type="button" size="sm" variant={p.theme === t ? 'default' : 'outline'} onClick={() => setP({ ...p, theme: t })}>{t}</Button>)}</div>
        </div>
        <details><summary className="cursor-pointer text-sm font-medium">Social icons</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{SOCIALS.map((s) => (
            <div key={s}><Label htmlFor={`s-${s}`} className="capitalize">{s}</Label>
              <Input id={`s-${s}`} placeholder="https://..." value={p.socials?.[s] || ''} onChange={(e) => setP({ ...p, socials: { ...(p.socials || {}), [s]: e.target.value } })} /></div>
          ))}</div>
        </details>
        {canHideBadge
          ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.hide_badge} onChange={(e) => setP({ ...p, hide_badge: e.target.checked })} />Hide &quot;Made with SaaS Nation&quot; badge</label>
          : <p className="text-xs text-muted-foreground">The &quot;Made with SaaS Nation&quot; badge can be hidden with <Link href="/pricing" className="underline">All Access</Link>.</p>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.show_funnels} onChange={(e) => setP({ ...p, show_funnels: e.target.checked })} />List my published funnels</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} />Page is public</label>
        <Button onClick={saveProfile}>Save profile</Button>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Links</h2>
        {!saved && <p className="text-sm text-muted-foreground">Save your profile first.</p>}
        {links.map((l, i) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2 border-b pb-2" data-link={l.id}>
            <Input className="flex-1 min-w-[8rem]" value={l.title} aria-label="Title" onChange={(e) => setLinks(links.map((x) => x.id === l.id ? { ...x, title: e.target.value } : x))} onBlur={() => updateLink(links[i])} />
            <Input className="flex-[2] min-w-[10rem]" value={l.url} aria-label="URL" onChange={(e) => setLinks(links.map((x) => x.id === l.id ? { ...x, url: e.target.value } : x))} onBlur={() => updateLink(links[i])} />
            <span className="text-xs text-muted-foreground w-20 text-right" title="Clicks">{l.clicks} clicks</span>
            <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {saved && (
          <div className="flex flex-wrap gap-2">
            <Input className="flex-1 min-w-[8rem]" placeholder="Title" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} />
            <Input className="flex-[2] min-w-[10rem]" placeholder="https://..." value={nl.url} onChange={(e) => setNl({ ...nl, url: e.target.value })} />
            <Button onClick={() => addLink()} disabled={links.length >= MAX_LINKS}>Add link</Button>
          </div>
        )}
        {saved && quickAdd.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">One-click add your pages:</p>
            <div className="flex flex-wrap gap-2">{quickAdd.map((q) => (
              <Button key={q.path} size="sm" variant="outline" disabled={links.length >= MAX_LINKS}
                onClick={() => addLink({ title: q.title.slice(0, 80), url: window.location.origin + q.path })}>+ {q.title}</Button>
            ))}</div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{links.length}/{MAX_LINKS} links. Your published funnels can also be listed automatically.</p>
      </section>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  )
}
