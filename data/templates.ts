export type AffiliateLink = {
  id: string
  url: string
  buttonText: string
  icon?: string // emoji or icon name
}

export type FunnelStep = {
  id: string
  type: 'landing' | 'lead-capture' | 'sales' | 'thank-you' | 'affiliate-link'
  title: string
  content: string
  order: number
  // Affiliate link specific fields
  affiliateUrl?: string // legacy support
  buttonText?: string // legacy support
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
  affiliateLinks?: AffiliateLink[] // new multi-link support
  buttonStyle?: 'modern' | 'sharp' | 'pill' | 'gradient' | 'outline' | 'glass'
  // Additional customization options
  headline?: string
  subheadline?: string
  ctaText?: string
  ctaUrl?: string
  formFields?: string[] // for lead capture
  showSocialProof?: boolean
  testimonials?: string[]
  features?: string[]
  // funnel-maker v1 template fields (validated again at render time)
  bookingUrl?: string // Calendly / Cal.com, https only (thank-you step of Book a call)
  paymentLink?: string // seller's own Stripe Payment Link, https://buy.stripe.com/... (sales step)
  priceLabel?: string // e.g. "$49"
  downloadUrl?: string // https link or Supabase Storage public URL (thank-you step of Free download)
  downloadLabel?: string
  pricing?: {
    amount: string
    currency: string
    interval?: string
  }
}

export type TemplateId = 'book-call' | 'sales-page' | 'free-download'

export type FunnelTemplate = {
  id: TemplateId
  name: string
  description: string
  steps: FunnelStep[]
}

export const templates: FunnelTemplate[] = [
  {
    id: 'book-call',
    name: 'Book a call',
    description: 'Lead form, then a thank-you page with your Calendly or Cal.com booking calendar.',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', ctaText: 'Book your free call',
        content: 'Get a free 20-minute intro call.\n\nTell me a bit about your goals and pick a time that suits you.' },
      { id: '2', type: 'lead-capture', order: 1, title: 'Your details', formFields: ['name', 'email', 'phone', 'message'], ctaText: 'Continue to booking',
        content: 'Leave your details, then pick a time on the next page.' },
      { id: '3', type: 'thank-you', order: 2, title: 'Pick a time', bookingUrl: '',
        content: 'Thanks! Pick a time below and you will get a calendar invite.' },
    ],
  },
  {
    id: 'sales-page',
    name: 'Sales page',
    description: 'Offer page with a buy button that goes to your own Stripe Payment Link, plus a thank-you page.',
    steps: [
      { id: '1', type: 'sales', order: 0, title: 'Offer', priceLabel: '$49', paymentLink: '', ctaText: 'Buy now',
        content: 'Describe your offer here.\n\n• What they get\n• Who it is for\n• Why now' },
      { id: '2', type: 'thank-you', order: 1, title: 'Thank you',
        content: 'Thanks for your purchase! Check your email for the Stripe receipt. I will be in touch shortly.' },
    ],
  },
  {
    id: 'free-download',
    name: 'Free download',
    description: 'Email capture, then a thank-you page with the download link (no emails are sent).',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', ctaText: 'Get the free guide',
        content: 'Download my free guide.\n\nEnter your email and get instant access on the next page.' },
      { id: '2', type: 'lead-capture', order: 1, title: 'Get access', formFields: ['name', 'email'], ctaText: 'Get instant access',
        content: 'Where should we keep you posted?' },
      { id: '3', type: 'thank-you', order: 2, title: 'Your download', downloadUrl: '', downloadLabel: 'Download the PDF',
        content: 'Here is your download. Enjoy!' },
    ],
  },
]

export const TEMPLATE_IDS = templates.map((t) => t.id)
