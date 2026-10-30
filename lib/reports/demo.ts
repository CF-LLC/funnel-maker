// Sample data for the demo account (Riverside) and the public demo page (/r/demo). Nothing here is real or stored.
import { addMonths, defaultTemplate, monthDate, monthLabel, thisMonth, type Client, type Image, type Report } from './core'

export const DEMO_OWNER = 'Riverside Fitness'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
export function demoClients(): Client[] {
  const t = defaultTemplate()
  return [
    { id: id(1), name: 'Maple & Co Bakery', email: null, template: t, token: 'demo', revoked: false, last_viewed_at: ago(1), view_count: 14, created_at: ago(200), updated_at: ago(1) },
    { id: id(2), name: 'Northside Physio', email: null, template: t, token: 'demo', revoked: false, last_viewed_at: ago(6), view_count: 5, created_at: ago(90), updated_at: ago(6) },
  ]
}
const SERIES = { visitors: [3120, 3480, 3305, 3920, 4410, 4980], leads: [41, 46, 44, 58, 63, 77], conversion: [1.3, 1.3, 1.3, 1.5, 1.4, 1.5], revenue: [6200, 6900, 6500, 8100, 8800, 10450] }
export function demoReports(clientId = id(1)): Report[] {
  const end = addMonths(thisMonth(), -1)
  const c = demoClients().find((x) => x.id === clientId) || demoClients()[0]
  return Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(end, i - 5)
    return {
      id: id(100 + i + (clientId === id(2) ? 50 : 0)), client_id: c.id, month: monthDate(m), title: `${c.name}: ${monthLabel(m)}`, layout: c.template,
      kpi_values: Object.fromEntries(Object.entries(SERIES).map(([k, v]) => [k, clientId === id(2) ? Math.round(v[i] * 0.4 * 10) / 10 : v[i]])),
      notes: i === 5 ? 'Launched the spring menu landing page and two Instagram promos. Leads were up most weeks; the Saturday promo did best.\n\nNext month: a Google Business Profile refresh and a customer review push.' : 'Steady month. Kept the weekly posts going and fixed the contact form on mobile.',
      shared: i < 5 || clientId === id(1), created_at: ago(180 - i * 30), updated_at: ago(170 - i * 30),
    }
  })
}
export const DEMO_IMAGES: { slot: number; url: string; caption: string }[] = [
  { slot: 0, url: '/shots/reports-demo-1.svg', caption: 'Traffic by week' },
  { slot: 1, url: '/shots/reports-demo-2.svg', caption: 'Local search ranking' },
]
export function demoImages(reportId: string): Image[] {
  return DEMO_IMAGES.map((d) => ({ id: id(900 + d.slot), report_id: reportId, slot: d.slot, name: `screenshot-${d.slot + 1}.png`, mime: 'image/png', size_bytes: 240_000, caption: d.caption }))
}
