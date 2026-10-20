'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, Check, Copy, Download, ExternalLink, Globe, Loader2, Monitor, MoreHorizontal, Plus, Smartphone, Trash2, Eye, Pencil, Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SortableStep } from '@/components/builder/sortable-step'
import { CollaboratorPresence } from '@/components/builder/collaborator-presence'
import { StepTypeDialog } from '@/components/builder/step-type-dialog'
import { TemplateFieldsEditor, publishErrorMessage } from '@/components/builder/template-fields-editor'
import { LandingEditor, LeadCaptureEditor, SalesEditor, ThankYouEditor, AffiliateLinkEditor } from '@/components/builder/step-editors'
import { Stepper } from '@/components/builder/stepper'
import { FunnelRenderer, headlineOf } from '@/components/funnel/funnel-renderer'
import { toast } from '@/components/ui/toast'
import { safeHttpsUrl } from '@/lib/url-safety'
import { templates, type FunnelStep } from '@/data/templates'
import { RealtimeCollaboration, Collaborator } from '@/lib/realtime-collaboration'

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://funnels.saasnation.site').replace(/\/$/, '')

function sanitizeSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function FunnelBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const funnelId = params.funnelId as string
  const [funnel, setFunnel] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [funnelName, setFunnelName] = useState('')
  const [funnelSlug, setFunnelSlug] = useState('')
  const [steps, setSteps] = useState<FunnelStep[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [publishing, setPublishing] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const collabRef = useRef<RealtimeCollaboration | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [userId, setUserId] = useState('')
  const [showStepTypeDialog, setShowStepTypeDialog] = useState(false)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [device, setDevice] = useState<'phone' | 'desktop'>('desktop')
  const loaded = useRef(false)
  const lastSaved = useRef('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data }, { data: { user } }] = await Promise.all([
        (supabase.from('funnels') as any).select('*').eq('id', funnelId).single(),
        supabase.auth.getUser(),
      ])
      if (cancelled) return
      if (!data) { setNotFound(true); return }
      setFunnel(data)
      setFunnelName(data.name)
      setFunnelSlug(data.slug || sanitizeSlug(data.name || ''))
      const s: FunnelStep[] = Array.isArray(data.steps) ? data.steps : []
      setSteps(s)
      setSelectedId(s[0]?.id ?? null)
      setIsPublic(!!data.is_public)
      lastSaved.current = JSON.stringify({ n: data.name, s })
      loaded.current = true
      if (user) {
        setUserId(user.id)
        const collab = new RealtimeCollaboration(funnelId, user.id, user.email || '')
        collab.connect(
          (c) => setCollaborators(c.filter((x) => x.id !== user.id)),
          (updated) => setSteps(updated),
        )
        collabRef.current = collab
      }
    })()
    return () => { cancelled = true; collabRef.current?.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelId])

  // Autosave name + steps (debounced). Slug and publishing are saved explicitly from the Publish panel.
  useEffect(() => {
    if (!loaded.current) return
    const snap = JSON.stringify({ n: funnelName, s: steps })
    if (snap === lastSaved.current) return
    setSaveState('dirty')
    const t = setTimeout(async () => {
      setSaveState('saving')
      const { error } = await (supabase.from('funnels') as any).update({ name: funnelName, steps }).eq('id', funnelId)
      if (!error) lastSaved.current = snap
      setSaveState(error ? 'error' : 'saved')
      if (error) toast(`Autosave failed: ${error.message}`, 'error')
    }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelName, steps])

  const commitSteps = useCallback((next: FunnelStep[]) => {
    setSteps(next)
    collabRef.current?.broadcastUpdate(next)
  }, [])

  const selectedStep = steps.find((s) => s.id === selectedId) || null
  const updateStep = (u: FunnelStep) => commitSteps(steps.map((s) => (s.id === u.id ? u : s)))
  const patchStep = (id: string, patch: Partial<FunnelStep>) => {
    const cur = steps.find((s) => s.id === id)
    if (!cur) return
    const changed = Object.entries(patch).some(([k, v]) => (cur as any)[k] !== v)
    if (changed) commitSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = steps.findIndex((i) => i.id === active.id)
    const newIndex = steps.findIndex((i) => i.id === over.id)
    commitSteps(arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order: i })))
  }

  const createStepWithType = (type: FunnelStep['type']) => {
    const titles: Record<string, string> = { landing: 'New section', 'lead-capture': 'Signup form', sales: 'Offer', 'thank-you': 'Thank you', 'affiliate-link': 'Links' }
    const s: FunnelStep = { id: `step-${Date.now()}`, type, title: titles[type] || 'New page', headline: titles[type] || 'New page', content: 'Click here to write your text.', order: steps.length }
    if (type === 'affiliate-link') { s.affiliateLinks = []; s.buttonStyle = 'modern' }
    else if (type === 'lead-capture') { s.formFields = ['name', 'email']; s.ctaText = 'Submit' }
    else if (type === 'sales') { s.ctaText = 'Buy now' }
    else if (type === 'landing') { s.ctaText = 'Get started' }
    commitSteps([...steps, s])
    setSelectedId(s.id)
    toast('Page added')
  }

  const deleteStep = (id: string) => {
    commitSteps(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })))
    if (selectedId === id) setSelectedId(null)
    toast('Page removed', 'info')
  }

  const publicLink = funnelSlug ? `${SITE}/f/${sanitizeSlug(funnelSlug)}` : `${SITE}/public/${funnelId}`

  async function setPublished(next: boolean) {
    setPublishing(true)
    const slug = sanitizeSlug(funnelSlug)
    const prev = isPublic
    setIsPublic(next) // optimistic
    const { error } = await (supabase.from('funnels') as any)
      .update({ name: funnelName, steps, slug: slug || null, is_public: next })
      .eq('id', funnelId)
    setPublishing(false)
    if (error) {
      setIsPublic(prev)
      if (error.code === '23505') toast('That link is taken. Try a different one.', 'error')
      else toast(publishErrorMessage(error) || `Could not ${next ? 'publish' : 'unpublish'}: ${error.message}`, 'error')
      return
    }
    setFunnelSlug(slug)
    lastSaved.current = JSON.stringify({ n: funnelName, s: steps })
    setSaveState('saved')
    toast(next ? 'Your funnel is live 🎉' : 'Funnel unpublished', next ? 'success' : 'info')
  }

  async function saveSlug() {
    const slug = sanitizeSlug(funnelSlug)
    const { error } = await (supabase.from('funnels') as any).update({ slug: slug || null }).eq('id', funnelId)
    if (error) toast(error.code === '23505' ? 'That link is taken. Try a different one.' : error.message, 'error')
    else { setFunnelSlug(slug); toast('Link saved') }
  }

  const copyPublicLink = async () => {
    try { await navigator.clipboard.writeText(publicLink); toast('Link copied') } catch { toast(publicLink, 'info') }
  }

  const exportFunnel = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/funnels/${funnelId}/export`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${funnelName.toLowerCase().replace(/\s+/g, '-')}-funnel.zip`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast('Export downloaded')
    } catch (e: any) {
      toast(`Export failed: ${e?.message || 'error'}`, 'error')
    } finally { setExporting(false) }
  }

  const deleteFunnel = async () => {
    if (!confirm('Delete this funnel? This cannot be undone.')) return
    const { error } = await supabase.from('funnels').delete().eq('id', funnelId)
    if (error) return toast(`Could not delete: ${error.message}`, 'error')
    toast('Funnel deleted', 'info')
    router.push('/dashboard/funnels')
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-bold">Funnel not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted, or you may not have access.</p>
        <Button asChild className="mt-6"><Link href="/dashboard/funnels">Back to my funnels</Link></Button>
      </div>
    )
  }
  if (!funnel) return <BuilderSkeleton />

  const templateName = templates.find((t) => t.id === funnel.template)?.name

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to funnels"><Link href="/dashboard/funnels"><ArrowLeft /></Link></Button>
        <div className="min-w-0 flex-1">
          <Input aria-label="Funnel name" value={funnelName} onChange={(e) => setFunnelName(e.target.value)}
            className="h-auto border-transparent bg-transparent px-2 py-1 text-xl font-bold shadow-none hover:border-input sm:text-2xl" placeholder="Name your funnel" />
          <div className="px-2 text-xs text-muted-foreground"><SaveIndicator state={saveState} />{templateName && <> · {templateName}</>}</div>
        </div>
        <CollaboratorPresence collaborators={collaborators} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportFunnel} disabled={exporting}><Download className="mr-2 h-4 w-4" />{exporting ? 'Exporting…' : 'Export HTML'}</DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/dashboard/funnels/${funnelId}/analytics`}><Globe className="mr-2 h-4 w-4" />Analytics</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={deleteFunnel} className="text-red-600 focus:text-red-700"><Trash2 className="mr-2 h-4 w-4" />Delete funnel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stepper current={isPublic ? 3 : 2} />
      </div>

      {/* Mobile tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 lg:hidden" role="tablist">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={mobileTab === t} onClick={() => setMobileTab(t)}
            className={`press flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-semibold ${mobileTab === t ? 'bg-white shadow text-violet-700' : 'text-muted-foreground'}`}>
            {t === 'edit' ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr] lg:gap-6">
        {/* Left: pages + fields + publish */}
        <div className={`space-y-4 ${mobileTab === 'edit' ? '' : 'hidden lg:block'}`}>
          <PublishPanel isPublic={isPublic} publishing={publishing} slug={funnelSlug} onSlug={setFunnelSlug} onSaveSlug={saveSlug}
            link={publicLink} onCopy={copyPublicLink} onToggle={() => setPublished(!isPublic)} />

          <section className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Pages</h2>
              <Button size="sm" variant="outline" onClick={() => setShowStepTypeDialog(true)}><Plus /> Add page</Button>
            </div>
            {steps.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="font-medium">This funnel is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">Add a page, or start again from a ready-made template.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={() => setShowStepTypeDialog(true)}><Plus /> Add a page</Button>
                  <Button asChild variant="outline"><Link href="/dashboard/templates">Browse templates</Link></Button>
                </div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <SortableStep key={step.id} step={step} isSelected={selectedId === step.id}
                        onClick={() => setSelectedId(step.id)} onDelete={() => deleteStep(step.id)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {steps.length > 1 && <p className="mt-3 text-xs text-muted-foreground">Drag to reorder. Thank-you pages show after the form is sent.</p>}
          </section>

          {selectedStep && (
            <section className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Edit “{headlineOf(selectedStep) || selectedStep.title}”</h2>
                <button className="press text-sm font-semibold text-violet-700 lg:hidden min-h-[44px] px-2" onClick={() => setMobileTab('preview')}>Preview →</button>
              </div>
              <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">Tip: you can also click any headline or text in the preview and type.</p>
              <div className="space-y-1.5">
                <Label htmlFor="f-headline">Headline</Label>
                <Input id="f-headline" value={headlineOf(selectedStep)} onChange={(e) => patchStep(selectedStep.id, { headline: e.target.value })} placeholder="A short, bold promise" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-content">Text</Label>
                <Textarea id="f-content" rows={4} value={selectedStep.content} onChange={(e) => patchStep(selectedStep.id, { content: e.target.value })} />
              </div>
              {selectedStep.type !== 'thank-you' && selectedStep.type !== 'affiliate-link' && (
                <div className="space-y-1.5">
                  <Label htmlFor="f-cta">Button text</Label>
                  <Input id="f-cta" value={selectedStep.ctaText || ''} onChange={(e) => patchStep(selectedStep.id, { ctaText: e.target.value })} placeholder="Get started" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="f-img">Image (optional)</Label>
                <Input id="f-img" inputMode="url" value={selectedStep.imageUrl || ''} onChange={(e) => patchStep(selectedStep.id, { imageUrl: e.target.value.trim() })} placeholder="https://…/photo.jpg" />
                {selectedStep.imageUrl && !safeHttpsUrl(selectedStep.imageUrl) && <p className="text-xs text-red-600">Use an https:// image link</p>}
              </div>
              <TemplateFieldsEditor step={selectedStep} onUpdate={updateStep} userId={userId} slug={funnelSlug} />
              <details className="group rounded-xl border p-3">
                <summary className="cursor-pointer select-none text-sm font-semibold min-h-[32px] flex items-center">More settings</summary>
                <div className="mt-3">
                  <div className="space-y-1.5 mb-4">
                    <Label htmlFor="f-title">Page name (only you see this)</Label>
                    <Input id="f-title" value={selectedStep.title} onChange={(e) => patchStep(selectedStep.id, { title: e.target.value })} />
                  </div>
                  {selectedStep.type === 'landing' && <LandingEditor step={selectedStep} onUpdate={updateStep} />}
                  {selectedStep.type === 'lead-capture' && <LeadCaptureEditor step={selectedStep} onUpdate={updateStep} />}
                  {selectedStep.type === 'sales' && <SalesEditor step={selectedStep} onUpdate={updateStep} />}
                  {selectedStep.type === 'thank-you' && <ThankYouEditor step={selectedStep} onUpdate={updateStep} />}
                  {selectedStep.type === 'affiliate-link' && <AffiliateLinkEditor step={selectedStep} onUpdate={updateStep} />}
                </div>
              </details>
            </section>
          )}
        </div>

        {/* Right: live preview */}
        <div className={`${mobileTab === 'preview' ? '' : 'hidden lg:block'}`}>
          <div className="lg:sticky lg:top-20 rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live preview</span>
              <div className="hidden gap-1 rounded-lg bg-muted p-1 lg:flex" role="group" aria-label="Preview size">
                <button aria-pressed={device === 'phone'} onClick={() => setDevice('phone')} className={`press rounded-md p-1.5 ${device === 'phone' ? 'bg-white shadow' : ''}`} aria-label="Phone preview"><Smartphone className="h-4 w-4" /></button>
                <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} className={`press rounded-md p-1.5 ${device === 'desktop' ? 'bg-white shadow' : ''}`} aria-label="Desktop preview"><Monitor className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="bg-muted/60 p-0 lg:p-4">
              <div data-scroll-root className={`mx-auto overflow-y-auto overflow-x-hidden bg-white lg:rounded-xl lg:shadow-lg transition-[max-width] duration-300 h-[70svh] lg:h-[calc(100svh-12rem)] ${device === 'phone' ? 'max-w-[390px]' : 'max-w-full'}`}>
                <FunnelRenderer funnel={{ ...funnel, name: funnelName, slug: funnelSlug, steps }} mode="all"
                  edit={{ selectedId, onSelect: (id) => setSelectedId(id), onChange: (id, p) => patchStep(id, p as Partial<FunnelStep>) }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <StepTypeDialog open={showStepTypeDialog} onClose={() => setShowStepTypeDialog(false)} onSelect={createStepWithType} />
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving' || state === 'dirty') return <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
  if (state === 'saved') return <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3 w-3" />All changes saved</span>
  if (state === 'error') return <span className="text-red-600">Not saved, retrying on next change</span>
  return <span>Changes save automatically</span>
}

function PublishPanel({ isPublic, publishing, slug, onSlug, onSaveSlug, link, onCopy, onToggle }: {
  isPublic: boolean; publishing: boolean; slug: string; onSlug: (s: string) => void; onSaveSlug: () => void
  link: string; onCopy: () => void; onToggle: () => void
}) {
  return (
    <section className={`rounded-2xl border p-4 ${isPublic ? 'border-emerald-200 bg-emerald-50/60' : 'bg-card'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{isPublic ? 'Live' : 'Ready to publish?'}</h2>
          <p className="text-xs text-muted-foreground">{isPublic ? 'Anyone with the link can see it.' : 'Only you can see this funnel right now.'}</p>
        </div>
        <Button onClick={onToggle} disabled={publishing} variant={isPublic ? 'outline' : 'default'}>
          {publishing ? <Loader2 className="animate-spin" /> : isPublic ? null : <Rocket />}
          {isPublic ? 'Unpublish' : 'Publish'}
        </Button>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="f-slug" className="text-xs">Your link</Label>
        <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="hidden shrink-0 pl-3 text-sm text-muted-foreground sm:inline">/f/</span>
          <input id="f-slug" value={slug} onChange={(e) => onSlug(e.target.value)} onBlur={onSaveSlug} placeholder="my-funnel"
            className="min-h-[44px] min-w-0 flex-1 bg-transparent px-3 text-base outline-none sm:px-1 sm:text-sm" />
        </div>
      </div>
      {isPublic && (
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCopy}><Copy /> Copy link</Button>
          <Button asChild variant="outline"><a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink /> View</a></Button>
        </div>
      )}
    </section>
  )
}

function BuilderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading builder">
      <div className="flex items-center gap-3"><div className="skeleton h-10 w-10 rounded-lg" /><div className="skeleton h-9 w-64 max-w-[60%] rounded-lg" /></div>
      <div className="skeleton h-7 w-72 max-w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr] lg:gap-6">
        <div className="space-y-4"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-56 rounded-2xl" /></div>
        <div className="skeleton hidden h-[70svh] rounded-2xl lg:block" />
      </div>
    </div>
  )
}
