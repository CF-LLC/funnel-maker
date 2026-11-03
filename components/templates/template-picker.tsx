'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, Loader2, Sparkles } from 'lucide-react'
import { templates, type FunnelTemplate } from '@/data/templates'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ui/toast'
import { templatePreview } from '@/data/template-previews'

/**
 * Step 1 of the guided flow. Picking a template creates the funnel (optimistically showing
 * "Creating…" on the card) and drops you straight into the editor. Logged-out visitors are sent
 * to sign up and land back here with the template remembered.
 */
export function TemplatePicker({ returnTo }: { returnTo: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const start = new URLSearchParams(window.location.search).get('start')
    const pending = sessionStorage.getItem('pendingTemplate') || start
    if (pending) {
      sessionStorage.removeItem('pendingTemplate')
      use(pending)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function use(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template || busy) return
    setBusy(templateId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      sessionStorage.setItem('pendingTemplate', templateId)
      router.push(`/auth/login?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }
    try {
      const { data: existing, error: checkErr } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle()
      if (!existing && !checkErr) {
        const { error } = await supabase.from('users').insert([{ id: user.id, email: user.email! }] as any)
        if (error) throw new Error(error.message)
      }
      const { data, error } = await supabase
        .from('funnels')
        .insert([{ user_id: user.id, name: template.name, template: template.id, steps: template.steps }] as any)
        .select('id')
      if (error) throw new Error(error.message?.includes('funnels_access_required') ? 'your Funnel Maker subscription is not active. Renew on the Billing page.' : error.message)
      const id = (data?.[0] as any)?.id
      if (!id) throw new Error('No funnel id returned')
      toast(`${template.name} created. Click any text to edit it.`)
      router.push(`/funnels/${id}?new=1`)
    } catch (e: any) {
      toast(`Could not create the funnel: ${e?.message || 'unknown error'}`, 'error')
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t, i) => <TemplateCard key={t.id} t={t} eager={i < 3} busy={busy === t.id} disabled={!!busy && busy !== t.id} onUse={() => use(t.id)} />)}
    </div>
  )
}

function TemplateCard({ t, eager, busy, disabled, onUse }: { t: FunnelTemplate; eager: boolean; busy: boolean; disabled: boolean; onUse: () => void }) {
  const isNew = t.theme !== 'classic'
  return (
    <article className="lift group flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[16/10] overflow-hidden border-b" style={{ background: t.swatch }}>
        <PreviewImage t={t} eager={eager} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#111827] shadow">
          {isNew && <Sparkles className="h-3 w-3 text-fuchsia-600" />}{t.effect}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold">{t.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{t.steps.length} pages: {t.steps.map((s) => s.title).join(' → ')}</p>
        <div className="mt-auto flex gap-2 pt-2">
          <button onClick={onUse} disabled={busy || disabled}
            className="press inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Use this template <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
          </button>
          <Link href={`/templates/preview/${t.id}`} target="_blank" aria-label={`Preview ${t.name}`}
            className="press inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold hover:border-violet-400 hover:text-violet-700">
            <Eye className="h-4 w-4" /><span className="hidden sm:inline">Preview</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

/** Real screenshot of the template's first screen. Fixed width/height so cards never shift. */
function PreviewImage({ t, eager }: { t: FunnelTemplate; eager: boolean }) {
  const p = templatePreview(t.id)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.src} srcSet={p.srcSet} sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
      width={p.width} height={p.height} alt={p.alt}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async"
      className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
  )
}
