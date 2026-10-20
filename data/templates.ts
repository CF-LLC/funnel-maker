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
  imageUrl?: string // optional hero image, https only (checked again at render time)
  pricing?: {
    amount: string
    currency: string
    interval?: string
  }
}

export type TemplateId =
  | 'book-call' | 'sales-page' | 'free-download'
  | 'aurora-waitlist' | 'starfield-launch' | 'glass-webinar' | 'parallax-story' | 'neon-links'

/** Visual theme used by the public renderer. Effects are CSS or a light canvas and honor prefers-reduced-motion. */
export type ThemeId = 'classic' | 'aurora' | 'starfield' | 'glass' | 'parallax' | 'neon'

export type FunnelTemplate = {
  id: TemplateId
  name: string
  description: string
  theme: ThemeId
  /** Short label for the visual effect, shown in the picker. */
  effect: string
  /** Picker thumbnail background (CSS). */
  swatch: string
  steps: FunnelStep[]
}

export const templates: FunnelTemplate[] = [
  {
    id: 'book-call',
    theme: 'classic', effect: 'Clean & simple', swatch: 'linear-gradient(135deg,#eef2ff,#e0f2fe)',
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
    theme: 'classic', effect: 'Clean & simple', swatch: 'linear-gradient(135deg,#fdf4ff,#ede9fe)',
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
    theme: 'classic', effect: 'Clean & simple', swatch: 'linear-gradient(135deg,#ecfdf5,#e0f2fe)',
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
  {
    id: 'aurora-waitlist',
    theme: 'aurora', effect: 'Animated gradient', swatch: 'linear-gradient(120deg,#7c3aed,#db2777,#f59e0b)',
    name: 'Aurora waitlist',
    description: 'A glowing, slowly shifting gradient hero with an email waitlist. Great for launches and early access.',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', headline: 'Something bright is coming', ctaText: 'Join the waitlist',
        content: 'Be first in line when we open the doors.\n\nEarly members get founder perks.' },
      { id: '2', type: 'lead-capture', order: 1, title: 'Join', headline: 'Save your spot', formFields: ['name', 'email'], ctaText: 'Join the waitlist',
        content: 'No spam. One email when we launch.' },
      { id: '3', type: 'thank-you', order: 2, title: 'You are in', headline: "You're on the list ✨",
        content: 'Thanks for joining! We will email you the moment doors open.' },
    ],
  },
  {
    id: 'starfield-launch',
    theme: 'starfield', effect: 'Starfield background', swatch: 'radial-gradient(circle at 30% 30%,#312e81,#020617 70%)',
    name: 'Starfield launch',
    description: 'Deep-space hero with drifting stars. Perfect for apps, games and big announcements.',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', headline: 'Launch day is almost here', ctaText: 'Get launch access',
        content: 'A new way to get things done.\n\nSign up for launch-day access and a few surprises.' },
      { id: '2', type: 'lead-capture', order: 1, title: 'Get access', headline: 'Get on the launch list', formFields: ['name', 'email'], ctaText: 'Count me in',
        content: 'We only email when there is real news.' },
      { id: '3', type: 'thank-you', order: 2, title: 'Liftoff', headline: 'See you at liftoff 🚀',
        content: 'You are on the launch list. Watch your inbox.' },
    ],
  },
  {
    id: 'glass-webinar',
    theme: 'glass', effect: 'Glassmorphism', swatch: 'linear-gradient(135deg,#06b6d4,#6366f1 55%,#a855f7)',
    name: 'Glass webinar',
    description: 'Frosted-glass cards over colorful blobs. Built for webinar, workshop and event signups.',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', headline: 'Free live workshop', ctaText: 'Save my seat',
        content: 'Join a 45-minute live session and leave with a plan you can use tomorrow.\n\nSeats are limited.' },
      { id: '2', type: 'lead-capture', order: 1, title: 'Register', headline: 'Reserve your seat', formFields: ['name', 'email'], ctaText: 'Register free',
        content: 'We will send the join link and a reminder.' },
      { id: '3', type: 'thank-you', order: 2, title: 'Registered', headline: "You're registered 🎉",
        content: 'Check your email for the join link. Add it to your calendar so you do not miss it.' },
    ],
  },
  {
    id: 'parallax-story',
    theme: 'parallax', effect: 'Parallax + scroll reveal', swatch: 'linear-gradient(180deg,#fb923c,#e11d48 60%,#4c1d95)',
    name: 'Parallax story',
    description: 'Layered sunset hills that move as you scroll, with sections that fade in. Tells your story, then books a call.',
    steps: [
      { id: '1', type: 'landing', order: 0, title: 'Hero', headline: 'Your story starts here', ctaText: 'Book a free call',
        content: 'Scroll to see how we help people like you go from stuck to shipped.' },
      { id: '2', type: 'landing', order: 1, title: 'How it works', headline: 'How it works',
        content: '1. A quick call to understand your goals\n2. A clear plan within a week\n3. Real results you can see' },
      { id: '3', type: 'lead-capture', order: 2, title: 'Your details', headline: "Let's talk", formFields: ['name', 'email', 'message'], ctaText: 'Continue to booking',
        content: 'Tell us a bit about you, then pick a time.' },
      { id: '4', type: 'thank-you', order: 3, title: 'Pick a time', bookingUrl: '', headline: 'Pick a time that suits you',
        content: 'Thanks! Choose a slot below and you will get a calendar invite.' },
    ],
  },
  {
    id: 'neon-links',
    theme: 'neon', effect: 'Particles + neon glow', swatch: 'radial-gradient(circle at 50% 40%,#22d3ee55,#0f172a 60%)',
    name: 'Neon link hub',
    description: 'A link-in-bio page with floating particles and glowing buttons, plus an email signup.',
    steps: [
      { id: '1', type: 'affiliate-link', order: 0, title: 'Links', headline: 'Find me everywhere', textColor: '#ffffff',
        content: 'Creator, builder, coffee enthusiast.',
        affiliateLinks: [
          { id: 'l1', url: 'https://example.com', buttonText: '🎥 Latest video' },
          { id: 'l2', url: 'https://example.com', buttonText: '📰 My newsletter' },
          { id: 'l3', url: 'https://example.com', buttonText: '🛠️ Tools I use' },
        ] },
      { id: '2', type: 'lead-capture', order: 1, title: 'Stay in touch', headline: 'Stay in the loop', formFields: ['email'], ctaText: 'Subscribe',
        content: 'One short email a week. Unsubscribe anytime.' },
      { id: '3', type: 'thank-you', order: 2, title: 'Thanks', headline: 'Thanks for subscribing 💜', content: 'See you in your inbox.' },
    ],
  },
]

export const TEMPLATE_IDS = templates.map((t) => t.id)

export function themeFor(templateId?: string | null): ThemeId {
  return templates.find((t) => t.id === templateId)?.theme ?? 'classic'
}
