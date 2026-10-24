'use client'
import { STORAGE_PREFIX, isValidDownload } from '@/lib/downloads'
import { formEmbedSrc } from '@/lib/forms/core'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { safeBookingUrl, safePaymentLink } from '@/lib/url-safety'
import type { FunnelStep } from '@/data/templates'

type Props = { step: FunnelStep; onUpdate: (s: FunnelStep) => void; userId: string; slug: string }

const MAX_PDF = 10 * 1024 * 1024

function Hint({ value, ok, msg }: { value?: string; ok: boolean; msg: string }) {
  if (!value) return null
  return <p className={`text-xs mt-1 ${ok ? 'text-green-700' : 'text-red-600'}`}>{ok ? '✓ Looks good' : msg}</p>
}

export function TemplateFieldsEditor(props: Props) {
  const { step, onUpdate } = props
  const s = step as FunnelStep & { formEmbed?: string }
  return (
    <>
      <StepFields {...props} />
      <div className="space-y-1 border-t pt-4">
        <Label>Embed a form (optional)</Label>
        <Input value={s.formEmbed || ''} placeholder="/@yourhandle/form-name" onChange={(e) => onUpdate({ ...step, formEmbed: e.target.value.trim() } as FunnelStep)} />
        <Hint value={s.formEmbed} ok={!!formEmbedSrc(s.formEmbed)} msg="Paste the path of one of your published forms, like /@handle/form-name" />
      </div>
    </>
  )
}

function StepFields({ step, onUpdate, userId, slug }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function uploadPdf(file: File) {
    setUploadError('')
    if (file.type !== 'application/pdf') return setUploadError('PDF files only')
    if (file.size > MAX_PDF) return setUploadError('Max 10 MB')
    setUploading(true)
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-z0-9._-]+/gi, '-').slice(-80)
    const path = `${userId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('fm-downloads').upload(path, file, { contentType: 'application/pdf', upsert: false })
    setUploading(false)
    if (error) return setUploadError(error.message || 'Upload failed')
    // Private bucket: store a storage reference; visitors get it via the access-checked download route.
    onUpdate({ ...step, downloadUrl: `${STORAGE_PREFIX}${path}` })
  }

  if (step.type === 'sales') {
    return (
      <div className="space-y-3 border-t pt-4">
        <h4 className="font-semibold text-sm">Checkout</h4>
        <div>
          <Label>Price label</Label>
          <Input value={step.priceLabel || ''} maxLength={30} placeholder="$49" onChange={(e) => onUpdate({ ...step, priceLabel: e.target.value })} />
        </div>
        <div>
          <Label>Your Stripe Payment Link</Label>
          <Input value={step.paymentLink || ''} placeholder="https://buy.stripe.com/..." onChange={(e) => onUpdate({ ...step, paymentLink: e.target.value.trim() })} />
          <Hint value={step.paymentLink} ok={!!safePaymentLink(step.paymentLink)} msg="Must be an https://buy.stripe.com/... link from your own Stripe account" />
          <p className="text-xs text-muted-foreground mt-1">
            Payments go straight to your Stripe account. In Stripe, set the link&apos;s &quot;after payment&quot; page to{' '}
            <code>{typeof window !== 'undefined' ? window.location.origin : ''}/f/{slug || 'your-slug'}/thanks</code>
          </p>
        </div>
      </div>
    )
  }

  if (step.type === 'thank-you') {
    return (
      <div className="space-y-3 border-t pt-4">
        <h4 className="font-semibold text-sm">Booking calendar (Book a call)</h4>
        <div>
          <Label>Calendly or Cal.com link</Label>
          <Input value={step.bookingUrl || ''} placeholder="https://calendly.com/you/intro" onChange={(e) => onUpdate({ ...step, bookingUrl: e.target.value.trim() })} />
          <Hint value={step.bookingUrl} ok={!!safeBookingUrl(step.bookingUrl)} msg="Must be an https link on calendly.com or cal.com" />
        </div>
        <h4 className="font-semibold text-sm pt-2">Download (Free download)</h4>
        <div>
          <Label>Download link</Label>
          <Input value={step.downloadUrl || ''} placeholder="https://... or upload a PDF below" onChange={(e) => onUpdate({ ...step, downloadUrl: e.target.value.trim() })} />
          <Hint value={step.downloadUrl} ok={isValidDownload(step.downloadUrl)} msg="Must be an https link or an uploaded PDF" />
        </div>
        <div>
          <Label>…or upload a PDF (max 10 MB)</Label>
          <Input type="file" accept="application/pdf" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
          {uploading && <p className="text-xs mt-1">Uploading…</p>}
          {uploadError && <p className="text-xs mt-1 text-red-600">{uploadError}</p>}
        </div>
        <div>
          <Label>Button text</Label>
          <Input value={step.downloadLabel || ''} maxLength={60} placeholder="Download the PDF" onChange={(e) => onUpdate({ ...step, downloadLabel: e.target.value })} />
        </div>
      </div>
    )
  }
  return null
}

export function publishErrorMessage(err: { message?: string } | null | undefined): string | null {
  const m = err?.message || ''
  if (m.includes('account_pending_approval')) return 'Your account is waiting for approval. You can publish once it is approved (usually within 24 hours).'
  if (m.includes('funnels_access_required')) return 'Your Funnel Maker subscription isn\u2019t active, so funnels can\u2019t be published. Renew on the Billing page to go live again; your funnels and leads are kept.'
  if (m.includes('live_funnel_limit')) return 'You already have 3 live funnels, the maximum on your plan. Unpublish one first.'
  return null
}
