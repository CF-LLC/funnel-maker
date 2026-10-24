'use client'

import { useRef } from 'react'
import { LeadForm } from '@/components/lead-form'
import { CanvasField, useParallax, useScrollReveal } from '@/components/funnel/effects'
import { themeFor, type ThemeId } from '@/data/templates'
import { downloadHref } from '@/lib/downloads'
import { formEmbedSrc } from '@/lib/forms/core'
import { testimonialsEmbedSrc } from '@/lib/testimonials/core'
import { safeBookingUrl, safeCssColor, safeHttpsUrl, safePaymentLink, starterSitesUrl } from '@/lib/url-safety'

export type RenderStep = {
  id: string; type: string; title: string; content: string; order?: number
  headline?: string; ctaText?: string; formFields?: string[]; priceLabel?: string; paymentLink?: string
  bookingUrl?: string; formEmbed?: string; testimonialsEmbed?: string; downloadUrl?: string; downloadLabel?: string; imageUrl?: string
  backgroundColor?: string; textColor?: string
  affiliateLinks?: { id: string; url: string; buttonText: string }[]
}

export type RenderFunnel = { id: string; name: string; slug: string | null; template: string | null; steps: RenderStep[] }

/** Inline editing hooks used by the builder's live preview. */
export type EditHooks = {
  selectedId?: string | null
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<RenderStep>) => void
}

export const THANKS_TYPES = ['thank-you']
const INTERNAL_TITLES = ['Hero', 'Offer', 'Your details', 'Get access']
const DARK: ThemeId[] = ['aurora', 'starfield', 'neon', 'parallax']

export function headlineOf(step: RenderStep) {
  if (step.headline !== undefined) return step.headline
  // Builder titles like "Hero" are internal labels; show content-first for those.
  return INTERNAL_TITLES.includes(step.title) ? '' : step.title
}

export function FunnelRenderer({ funnel, mode, edit, preview = false }: {
  funnel: RenderFunnel; mode: 'main' | 'thanks' | 'all'; edit?: EditHooks; preview?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const theme = themeFor(funnel.template)
  const all = [...(funnel.steps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const steps = mode === 'all' ? all : all.filter((s) => (mode === 'thanks' ? THANKS_TYPES.includes(s.type) : !THANKS_TYPES.includes(s.type)))
  const thanksHref = funnel.slug && all.some((s) => THANKS_TYPES.includes(s.type)) ? `/f/${funnel.slug}/thanks` : undefined
  useScrollReveal(root, [steps.length, theme])
  useParallax(root, theme === 'parallax')
  const dark = DARK.includes(theme)

  return (
    <div ref={root} className={`fm-theme fm-theme-${theme} relative isolate min-h-full flex flex-col overflow-x-clip ${dark ? 'text-white' : 'text-gray-900'}`}>
      {theme === 'aurora' && <div aria-hidden className="fm-aurora-bg" />}
      {(theme === 'starfield' || theme === 'neon') && (
        <div aria-hidden className="pointer-events-none sticky top-0 -z-10 -mb-[100svh] h-[100svh] w-full">
          <CanvasField variant={theme === 'starfield' ? 'stars' : 'particles'} />
        </div>
      )}
      {theme === 'glass' && <div aria-hidden className="fm-glass-blobs"><span /><span /><span /></div>}
      <main className="flex-1">
        {steps.map((step, i) => {
          const selected = edit?.selectedId === step.id
          const bg = safeCssColor(step.backgroundColor)
          const img = safeHttpsUrl(step.imageUrl)
          const h = headlineOf(step)
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <section key={step.id}
              onClick={edit ? () => edit.onSelect(step.id) : undefined}
              className={`fm-section relative isolate px-5 sm:px-6 ${i === 0 ? 'py-20 sm:py-28' : 'py-16 sm:py-24'} ${edit ? 'cursor-pointer transition-shadow' : ''} ${selected ? 'outline outline-2 -outline-offset-2 outline-fuchsia-500' : edit ? 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-fuchsia-300' : ''}`}
              style={{ background: bg, color: safeCssColor(step.textColor) }}>
              {theme === 'parallax' && i === 0 && <ParallaxHills />}
              <div data-reveal className={`fm-reveal relative mx-auto max-w-3xl text-center space-y-6 ${theme === 'glass' ? 'fm-glass-card' : ''}`}>
                {img && <img src={img} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="mx-auto max-h-80 w-auto max-w-full rounded-2xl object-cover shadow-xl" />}
                {(h || edit) && (
                  <Heading
                    contentEditable={!!edit} suppressContentEditableWarning spellCheck={!!edit}
                    data-placeholder="Add a headline"
                    onBlur={edit ? (e) => edit.onChange(step.id, { headline: e.currentTarget.innerText.trim() }) : undefined}
                    className={`fm-heading font-extrabold tracking-tight leading-[1.1] break-words ${i === 0 ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-4xl'} ${edit ? 'fm-editable' : ''}`}>
                    {h}
                  </Heading>
                )}
                <p
                  contentEditable={!!edit} suppressContentEditableWarning
                  data-placeholder="Add some text"
                  onBlur={edit ? (e) => edit.onChange(step.id, { content: e.currentTarget.innerText }) : undefined}
                  className={`text-lg sm:text-xl whitespace-pre-wrap leading-relaxed break-words ${dark ? 'text-white/85' : 'text-gray-700'} ${edit ? 'fm-editable' : ''}`}>
                  {step.content}
                </p>
                <StepBody step={step} funnel={funnel} thanksHref={thanksHref} preview={preview || !!edit} />
                {formEmbedSrc(step.formEmbed) && (
                  <iframe src={formEmbedSrc(step.formEmbed)} title="Form" loading="lazy" className="w-full min-h-[560px] rounded-xl border bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                )}
                {testimonialsEmbedSrc(step.testimonialsEmbed) && (
                  <iframe src={testimonialsEmbedSrc(step.testimonialsEmbed)} title="Testimonials" loading="lazy" className="w-full min-h-[420px] rounded-xl border bg-white"
                    sandbox="allow-same-origin allow-popups" />
                )}
              </div>
            </section>
          )
        })}
        {steps.length === 0 && <div className="min-h-[50vh] flex items-center justify-center opacity-70">This page has no content yet.</div>}
      </main>
      <footer className={`relative py-6 px-4 text-center text-sm ${dark ? 'text-white/75' : 'text-gray-600'}`}>
        <a href={starterSitesUrl(funnel.template)} target="_blank" rel="noopener" className="font-semibold underline-offset-4 hover:underline">
          Want us to build it? See CF LLC Starter Sites →
        </a>
      </footer>
    </div>
  )
}

function ParallaxHills() {
  return (
    <div aria-hidden className="fm-parallax pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="fm-sun" />
      <div className="fm-hill fm-hill-3" />
      <div className="fm-hill fm-hill-2" />
      <div className="fm-hill fm-hill-1" />
    </div>
  )
}

function StepBody({ step, funnel, thanksHref, preview }: { step: RenderStep; funnel: RenderFunnel; thanksHref?: string; preview: boolean }) {
  const slug = funnel.slug || ''
  switch (step.type) {
    case 'landing': {
      return step.ctaText ? (
        <a href="#form" onClick={(e) => { e.preventDefault(); e.currentTarget.closest('.fm-theme')?.querySelector('form')?.scrollIntoView({ behavior: 'smooth' }) }}
          className="fm-cta">{step.ctaText}</a>
      ) : null
    }
    case 'lead-capture':
      return <div id="form"><LeadForm slug={slug} template={funnel.template} fields={step.formFields} ctaText={step.ctaText} thanksHref={thanksHref} preview={preview} /></div>
    case 'sales': {
      const link = safePaymentLink(step.paymentLink)
      return (
        <div className="space-y-4">
          {step.priceLabel && <div className="text-5xl font-bold">{step.priceLabel}</div>}
          {link ? (
            <a href={link} rel="noopener" className="fm-cta">{step.ctaText || 'Buy now'}</a>
          ) : (
            <p className="text-sm opacity-70">Checkout isn&apos;t set up yet.</p>
          )}
          {link && <p className="text-xs opacity-70">Secure checkout by Stripe</p>}
        </div>
      )
    }
    case 'thank-you': {
      const booking = safeBookingUrl(step.bookingUrl)
      const download = downloadHref(funnel.id, step)
      return (
        <div className="space-y-6">
          {download && (
            <a href={download} target="_blank" rel="noopener" download className="fm-cta">
              {step.downloadLabel || 'Download'}
            </a>
          )}
          {booking && (
            <iframe src={booking} title="Book a time" className="w-full h-[700px] border rounded-xl bg-white" loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" />
          )}
        </div>
      )
    }
    case 'affiliate-link':
      return (
        <div className="space-y-3 max-w-xl mx-auto">
          {(step.affiliateLinks || []).map((l) => {
            const href = safeHttpsUrl(l.url)
            return href ? <a key={l.id} href={href} target="_blank" rel="noopener noreferrer" className="fm-link-btn">{l.buttonText}</a> : null
          })}
        </div>
      )
    default:
      return null
  }
}
