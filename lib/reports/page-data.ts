// Builds what /r/<token> and its PDF show, for real tokens and for the public demo (/r/demo).
import { DEMO_TOKEN, isMonth, monthOf, reportView, type ViewSection } from './core'
import { getPublicReport } from './server'
import { DEMO_IMAGES, DEMO_OWNER, demoClients, demoReports } from './demo'

export type ClientPage = { client: string; owner: string; logoUrl: string | null; month: string; months: string[]; title: string; sections: ViewSection[]; demo: boolean }
export async function clientPage(token: string, month: string | null, viewerId: string | null, opts: { count?: boolean; pdf?: boolean } = {}): Promise<ClientPage | null> {
  if (token === DEMO_TOKEN) {
    const c = demoClients()[0], all = demoReports(c.id)
    const r = (isMonth(month) && all.find((x) => monthOf(x.month) === month)) || all[all.length - 1]
    const imgs = opts.pdf ? [] : DEMO_IMAGES.map((d) => ({ slot: d.slot, url: d.url, caption: d.caption }))
    return { client: c.name, owner: DEMO_OWNER, logoUrl: null, month: monthOf(r.month), months: all.map((x) => monthOf(x.month)).reverse(), title: r.title, sections: reportView(r, all, imgs), demo: true }
  }
  const p = await getPublicReport(token, month, viewerId, opts)
  if (!p) return null
  return {
    client: p.client, owner: p.owner.business_name || 'Your provider', logoUrl: p.owner.logo_url, month: monthOf(p.report.month), months: p.reports.map((x) => monthOf(x.month)),
    title: p.report.title, sections: reportView(p.report, p.reports, p.images.map((i) => ({ slot: i.slot, url: i.url, caption: i.caption }))), demo: false,
  }
}
