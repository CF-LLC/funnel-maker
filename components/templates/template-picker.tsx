'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, Loader2, Sparkles } from 'lucide-react'
import { templates, type FunnelTemplate } from '@/data/templates'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ui/toast'

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
      if (error) throw new Error(error.message)
      const id = (data?.[0] as any)?.id
      if (!id) throw new Error('No funnel id returned')
      toast(`${template.name} created. Click any text to edit it.`)
      router.push(`/dashboard/funnels/${id}?new=1`)
    } catch (e: any) {
      toast(`Could not create the funnel: ${e?.message || 'unknown error'}`, 'error')
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => <TemplateCard key={t.id} t={t} busy={busy === t.id} disabled={!!busy && busy !== t.id} onUse={() => use(t.id)} />)}
    </div>
  )
}

function TemplateCard({ t, busy, disabled, onUse }: { t: FunnelTemplate; busy: boolean; disabled: boolean; onUse: () => void }) {
  const isNew = t.theme !== 'classic'
  return (
    <article className="lift group flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: t.swatch }}>
        <ThumbArt t={t} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-900 shadow">
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

/** Tiny static mock of the page layout, so the picker stays fast (no iframes). */
function ThumbArt({ t }: { t: FunnelTemplate }) {
  const dark = t.theme !== 'classic'
  const bar = dark ? 'bg-white/80' : 'bg-gray-900/70'
  const sub = dark ? 'bg-white/45' : 'bg-gray-900/25'
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 transition-transform duration-500 group-hover:scale-[1.04]">
      {t.theme === 'starfield' && <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 70%,#fff,transparent),radial-gradient(1px 1px at 85% 60%,#fff,transparent),radial-gradient(1px 1px at 10% 80%,#fff,transparent)' }} />}
      <div className={`relative flex w-3/4 flex-col items-center gap-2 ${t.theme === 'glass' ? 'rounded-xl border border-white/40 bg-white/20 p-3 backdrop-blur' : ''}`}>
        <div className={`h-3 w-4/5 rounded-full ${bar}`} />
        <div className={`h-2 w-3/5 rounded-full ${sub}`} />
        <div className={`mt-1 h-5 w-24 rounded-full ${t.theme === 'neon' ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' : dark ? 'bg-white' : 'bg-brand'}`} />
      </div>
    </div>
  )
}
