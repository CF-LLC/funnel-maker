'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LeadForm } from '@/components/lead-form'
import { safeBookingUrl, safeCssColor, safeDownloadUrl, safeHttpsUrl, safePaymentLink, starterSitesUrl } from '@/lib/url-safety'

type Step = {
  id: string; type: string; title: string; content: string; order?: number
  ctaText?: string; formFields?: string[]; priceLabel?: string; paymentLink?: string
  bookingUrl?: string; downloadUrl?: string; downloadLabel?: string
  backgroundColor?: string; textColor?: string
  affiliateLinks?: { id: string; url: string; buttonText: string }[]
}

type Funnel = { id: string; name: string; slug: string | null; template: string | null; steps: Step[] }

const THANKS_TYPES = ['thank-you']

export function FunnelView({ slug, id, mode }: { slug?: string; id?: string; mode: 'main' | 'thanks' }) {
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(id ? `/api/public/funnels/${encodeURIComponent(id)}` : `/api/public/funnels/${encodeURIComponent(slug || '')}?bySlug=true`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Funnel not found')
        setFunnel(d.funnel)
      })
      .catch((e) => setError(e.message || 'Failed to load funnel'))
  }, [slug, id])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md"><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    )
  }
  if (!funnel) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  }

  const all = [...(funnel.steps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const steps = all.filter((s) => (mode === 'thanks' ? THANKS_TYPES.includes(s.type) : !THANKS_TYPES.includes(s.type)))
  const thanksHref = funnel.slug && all.some((s) => THANKS_TYPES.includes(s.type)) ? `/f/${funnel.slug}/thanks` : undefined

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <main className="flex-1">
        {steps.map((step) => (
          <section key={step.id} className="px-6 py-16 md:py-24 border-b last:border-b-0"
            style={{ background: safeCssColor(step.backgroundColor), color: safeCssColor(step.textColor) }}>
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {step.type !== 'lead-capture' && <h1 className="text-4xl md:text-5xl font-bold leading-tight">{headline(step)}</h1>}
              {step.type === 'lead-capture' && <h2 className="text-3xl font-bold">{headline(step)}</h2>}
              <p className="text-lg md:text-xl whitespace-pre-wrap opacity-90 leading-relaxed">{step.content}</p>
              <StepBody step={step} funnel={funnel} thanksHref={thanksHref} />
            </div>
          </section>
        ))}
        {steps.length === 0 && <div className="min-h-[50vh] flex items-center justify-center text-gray-500">This page has no content yet.</div>}
      </main>
      <footer className="py-5 text-center border-t text-sm text-gray-600 space-y-1">
        <a href={starterSitesUrl(funnel.template)} target="_blank" rel="noopener" className="font-semibold hover:text-gray-900 underline-offset-2 hover:underline">
          Want us to build it? See CF LLC Starter Sites →
        </a>
      </footer>
    </div>
  )
}

function headline(step: Step) {
  // Builder titles like "Hero" are internal labels; show content-first for those.
  return ['Hero', 'Offer', 'Your details', 'Get access'].includes(step.title) ? '' : step.title
}

function StepBody({ step, funnel, thanksHref }: { step: Step; funnel: Funnel; thanksHref?: string }) {
  const slug = funnel.slug || ''
  switch (step.type) {
    case 'landing': {
      return step.ctaText ? (
        <a href="#form" onClick={(e) => { e.preventDefault(); document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' }) }}
          className="inline-block px-8 py-4 bg-black text-white font-bold rounded-xl">{step.ctaText}</a>
      ) : null
    }
    case 'lead-capture':
      return <div id="form"><LeadForm slug={slug} template={funnel.template} fields={step.formFields} ctaText={step.ctaText} thanksHref={thanksHref} /></div>
    case 'sales': {
      const link = safePaymentLink(step.paymentLink)
      return (
        <div className="space-y-4">
          {step.priceLabel && <div className="text-5xl font-bold">{step.priceLabel}</div>}
          {link ? (
            <a href={link} rel="noopener" className="inline-block px-10 py-4 bg-black text-white font-bold text-lg rounded-xl">{step.ctaText || 'Buy now'}</a>
          ) : (
            <p className="text-sm text-gray-500">Checkout isn&apos;t set up yet.</p>
          )}
          {link && <p className="text-xs text-gray-500">Secure checkout by Stripe</p>}
        </div>
      )
    }
    case 'thank-you': {
      const booking = safeBookingUrl(step.bookingUrl)
      const download = safeDownloadUrl(step.downloadUrl)
      return (
        <div className="space-y-6">
          {download && (
            <a href={download} target="_blank" rel="noopener" download className="inline-block px-10 py-4 bg-black text-white font-bold text-lg rounded-xl">
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
            return href ? <a key={l.id} href={href} target="_blank" rel="noopener noreferrer" className="block px-8 py-4 bg-white text-gray-900 font-bold rounded-xl shadow">{l.buttonText}</a> : null
          })}
        </div>
      )
    default:
      return null
  }
}
