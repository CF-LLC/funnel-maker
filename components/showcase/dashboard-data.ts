import type { SupabaseClient } from '@supabase/supabase-js'

export type RecentItem = { tool: string; id: string; title: string; href: string; at: string }

/** Latest items across tools for one user (no new table: reads each tool's own rows, newest first). */
export async function recentWork(supabase: SupabaseClient | any, userId: string, perTool = 4): Promise<RecentItem[]> {
  const q = (table: string, cols: string, order: string) =>
    (supabase as any).from(table).select(cols).eq('user_id', userId).order(order, { ascending: false }).limit(perTool)
  const [f, inv, frm, prp, tst, lib] = await Promise.all([
    q('funnels', 'id, name, created_at', 'created_at'),
    q('inv_invoices', 'id, number, client_name, updated_at', 'updated_at'),
    q('frm_forms', 'id, title, updated_at', 'updated_at'),
    q('prp_proposals', 'id, title, client_name, updated_at', 'updated_at'),
    q('tst_reviews', 'id, name, updated_at', 'updated_at'),
    (supabase as any).from('lib_profiles').select('handle, display_name, updated_at').eq('user_id', userId).limit(1),
  ])
  const rows = (r: any) => (Array.isArray(r?.data) ? r.data : [])
  const items: RecentItem[] = [
    ...rows(f).map((x: any) => ({ tool: 'funnels', id: x.id, title: x.name || 'Untitled funnel', href: `/funnels/${x.id}`, at: x.created_at })),
    ...rows(inv).map((x: any) => ({ tool: 'invoices', id: x.id, title: `Invoice ${x.number ?? ''}${x.client_name ? ` · ${x.client_name}` : ''}`.trim(), href: `/invoices/${x.id}`, at: x.updated_at })),
    ...rows(frm).map((x: any) => ({ tool: 'forms', id: x.id, title: x.title || 'Untitled form', href: `/forms/${x.id}`, at: x.updated_at })),
    ...rows(prp).map((x: any) => ({ tool: 'proposals', id: x.id, title: x.title || x.client_name || 'Proposal', href: `/proposals/${x.id}`, at: x.updated_at })),
    ...rows(tst).map((x: any) => ({ tool: 'testimonials', id: x.id, title: `Review from ${x.name || 'a client'}`, href: '/testimonials', at: x.updated_at })),
    ...rows(lib).map((x: any) => ({ tool: 'linkinbio', id: `lib-${x.handle}`, title: x.display_name || `@${x.handle}`, href: '/links', at: x.updated_at })),
  ].filter((i) => i.at)
  return items.sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
