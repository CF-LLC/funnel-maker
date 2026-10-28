// Sample data for the demo account and the public demo store (/s/demo-store). Nothing here is real; no file is ever served.
import { DEMO_STORE_SLUG, type DlFile, type Order, type Product, type Store } from './core'

export const demoStore = (): Store => ({ slug: DEMO_STORE_SLUG, title: 'Demo Coach Shop', blurb: 'Guides, templates and a mini-course to help you land your first ten coaching clients.', accent: '#e50914', support_email: 'hello@example.com', email_delivery: false })
const P = (i: number, p: Partial<Product>): Product => ({
  id: `00000000-0000-4000-9000-${String(i).padStart(12, '0')}`, slug: 'x', title: '', subtitle: null, description: null, kind: 'pdf', price_label: null,
  payment_link: 'https://buy.stripe.com/test_demo', redirect_key: '00000000-0000-4000-a000-000000000000', has_code: true, max_downloads: 5, link_days: 7,
  published: true, sort: i, download_count: 0, created_at: new Date(Date.now() - i * 86_400_000 * 3).toISOString(), updated_at: new Date().toISOString(), ...p,
})
export function demoProducts(): Product[] {
  return [
    P(1, { slug: 'first-ten-clients', title: 'First Ten Clients', subtitle: 'The 30-day playbook I use with every new coach', kind: 'pdf', price_label: '$29', download_count: 184,
      description: 'A 42-page guide with scripts, a daily checklist and the exact DM templates that booked my first ten calls.\n\n- 30-day plan, one page per day\n- 12 copy-paste outreach scripts\n- Pricing worksheet' }),
    P(2, { slug: 'discovery-call-kit', title: 'Discovery Call Kit', subtitle: 'Questions, notes template and follow-up emails', kind: 'template', price_label: '$19', download_count: 97,
      description: 'Everything you need to run a calm, confident discovery call, in Notion and PDF.' }),
    P(3, { slug: 'offer-mini-course', title: 'Build Your Offer', subtitle: 'A 5-lesson mini-course (video + workbook)', kind: 'course', price_label: '$79', download_count: 41,
      description: 'Five short videos and a workbook to turn what you know into an offer people pay for.' }),
    P(4, { slug: 'morning-focus-audio', title: 'Morning Focus', subtitle: '10-minute guided audio for busy coaches', kind: 'audio', price_label: '$9', download_count: 63 }),
    P(5, { slug: 'client-onboarding-pack', title: 'Client Onboarding Pack', subtitle: 'Welcome packet, intake form and session tracker', kind: 'bundle', price_label: '$39', download_count: 22, published: false }),
  ]
}
export function demoFiles(productId: string): DlFile[] {
  const base = [
    { name: 'First-Ten-Clients.pdf', size_bytes: 4_812_331, mime: 'application/pdf' },
    { name: 'Outreach-Scripts.pdf', size_bytes: 612_002, mime: 'application/pdf' },
    { name: 'Pricing-Worksheet.pdf', size_bytes: 231_440, mime: 'application/pdf' },
  ]
  return base.map((f, i) => ({ id: `00000000-0000-4000-b000-${String(i).padStart(12, '0')}`, product_id: productId, download_count: 40 - i * 9, created_at: new Date().toISOString(), ...f }))
}
export function demoOrders(): Order[] {
  const ps = demoProducts(); const d = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString()
  return Array.from({ length: 9 }, (_, i) => ({
    id: `00000000-0000-4000-c000-${String(i).padStart(12, '0')}`, product_id: ps[i % 4].id, via: i % 3 === 0 ? 'code' : 'redirect',
    buyer_email: i % 2 ? `${['maya', 'sam', 'priya', 'jordan', 'ava'][i % 5]}@example.com` : null, downloads: i % 4, max_downloads: 5,
    expires_at: new Date(Date.now() + (7 - i) * 86_400_000).toISOString(), revoked: i === 5, emailed_at: null, created_at: d(i * 7 + 1),
  }))
}
