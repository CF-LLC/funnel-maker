// Client page v2 loader. Every query uses the signed-in user's session, an explicit user_id filter
// (owner RLS on every table) and a row limit. Rows link to a client ONLY by normalized email.
import { clientEmail, likeExact } from './email'
import { WS_ROWS, hours, section, type WsSection, type WsTool, type WsRow } from './workspace-core'

type Db = any
const IDS_LIMIT = 200
/** Throw on a PostgREST error so a broken query shows as an empty section + server log, never as wrong data. */
const ok = <T,>(r: T): T => { const e = (r as any)?.error; if (e) throw new Error(e.message || 'query failed'); return r }
const cnt = (r: any) => (typeof r?.count === 'number' ? r.count : 0)
const day = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? d + 'T12:00:00Z' : d).toISOString() : null)

export async function loadClientWorkspace(db: Db, uid: string, rawEmail: string, tools: WsTool[]): Promise<WsSection[]> {
  const email = clientEmail(rawEmail)
  if (!email) return []
  const e = likeExact(email)
  const head = { count: 'exact' as const, head: true }
  const keep = <T extends Record<string, any>>(rows: T[] | null | undefined, col: string) => (rows || []).filter((r) => clientEmail(r[col]) === email)

  const loaders: Record<WsTool, () => Promise<WsSection>> = {
    async portal() {
      const [p, un] = await Promise.all([
        db.from('pt_portals').select('id, client_name, client_email, revoked, view_count, last_viewed_at, created_at').eq('user_id', uid).ilike('client_email', e).order('created_at', { ascending: false }).limit(IDS_LIMIT),
        db.from('pt_portals').select('id', head).eq('user_id', uid).is('client_email', null),
      ]).then((rs) => rs.map(ok))
      const portals = keep(p.data, 'client_email')
      const ids = portals.map((x: any) => x.id)
      const files = ids.length ? ok(await db.from('pt_files').select('id, name, created_at', { count: 'exact' }).eq('user_id', uid).in('portal_id', ids).order('created_at', { ascending: false }).limit(WS_ROWS)) : { data: [], count: 0 }
      const rows: WsRow[] = portals.map((x: any) => ({ id: x.id, title: `Portal · ${x.client_name}${x.revoked ? ' (link off)' : ''}`, href: `/portal/${x.id}`, at: x.last_viewed_at || x.created_at, meta: `${x.view_count} view${x.view_count === 1 ? '' : 's'} · ${cnt(files)} shared file${cnt(files) === 1 ? '' : 's'}` }))
      return section('portal', { count: portals.length, rows, unlinked: cnt(un) })
    },
    async time() {
      const [c1, c2, un] = await Promise.all([
        db.from('tt_clients').select('id, crm_email').eq('user_id', uid).ilike('crm_email', e).limit(IDS_LIMIT),
        db.from('tt_clients').select('id, email').eq('user_id', uid).ilike('email', e).limit(IDS_LIMIT),
        db.from('tt_clients').select('id', head).eq('user_id', uid).is('crm_email', null).is('email', null),
      ]).then((rs) => rs.map(ok))
      const cids = [...new Set([...keep(c1.data, 'crm_email'), ...keep(c2.data, 'email')].map((r: any) => r.id))]
      const pr = cids.length ? ok(await db.from('tt_projects').select('id, name').eq('user_id', uid).in('client_id', cids).limit(IDS_LIMIT)) : { data: [] }
      const pname = new Map((pr.data || []).map((x: any) => [x.id, x.name]))
      const pids = [...pname.keys()]
      const en = pids.length ? ok(await db.from('tt_entries').select('id, project_id, entry_date, seconds, note, invoice_id', { count: 'exact' }).eq('user_id', uid).in('project_id', pids).order('entry_date', { ascending: false }).limit(WS_ROWS)) : { data: [], count: 0 }
      const rows: WsRow[] = (en.data || []).map((x: any) => ({ id: x.id, title: `${pname.get(x.project_id) || 'Project'}${x.note ? ' · ' + x.note : ''}`, href: '/time', at: day(x.entry_date), meta: `${x.seconds == null ? 'running' : hours(x.seconds)}${x.invoice_id ? ' · invoiced' : ''}` }))
      return section('time', { count: cnt(en), rows, unlinked: cnt(un) })
    },
    async expenses() {
      const [x, un] = await Promise.all([
        db.from('ex_expenses').select('id, expense_date, amount_cents, vendor, invoice_id, crm_email', { count: 'exact' }).eq('user_id', uid).ilike('crm_email', e).order('expense_date', { ascending: false }).limit(WS_ROWS),
        db.from('ex_expenses').select('id', head).eq('user_id', uid).is('crm_email', null),
      ]).then((rs) => rs.map(ok))
      const rows: WsRow[] = keep(x.data, 'crm_email').map((r: any) => ({ id: r.id, title: r.vendor, href: '/expenses', at: day(r.expense_date), meta: `$${(r.amount_cents / 100).toFixed(2)}${r.invoice_id ? ' · invoiced' : ''}` }))
      return section('expenses', { count: cnt(x), rows, unlinked: cnt(un) })
    },
    async approvals() {
      const [x, un] = await Promise.all([
        db.from('ap_items').select('id, title, client_email, revoked, created_at, updated_at', { count: 'exact' }).eq('user_id', uid).ilike('client_email', e).order('updated_at', { ascending: false }).limit(WS_ROWS),
        db.from('ap_items').select('id', head).eq('user_id', uid).is('client_email', null),
      ]).then((rs) => rs.map(ok))
      const rows: WsRow[] = keep(x.data, 'client_email').map((r: any) => ({ id: r.id, title: r.title + (r.revoked ? ' (link off)' : ''), href: `/approvals/${r.id}`, at: r.updated_at || r.created_at }))
      return section('approvals', { count: cnt(x), rows, unlinked: cnt(un) })
    },
    async changelog() {
      const [p, un] = await Promise.all([
        db.from('cl_projects').select('id, title, client_email, created_at').eq('user_id', uid).ilike('client_email', e).limit(IDS_LIMIT),
        db.from('cl_projects').select('id', head).eq('user_id', uid).is('client_email', null),
      ]).then((rs) => rs.map(ok))
      const projects = keep(p.data, 'client_email')
      const ptitle = new Map(projects.map((r: any) => [r.id, r.title]))
      const ids = [...ptitle.keys()]
      const rq = ids.length ? ok(await db.from('cl_requests').select('id, project_id, title, status, updated_at', { count: 'exact' }).eq('user_id', uid).in('project_id', ids).order('updated_at', { ascending: false }).limit(WS_ROWS)) : { data: [], count: 0 }
      const rows: WsRow[] = (rq.data || []).map((r: any) => ({ id: r.id, title: `${r.title}`, href: `/change-log/${r.project_id}`, at: r.updated_at, meta: `${ptitle.get(r.project_id) || 'Project'} · ${r.status}` }))
      if (!rows.length) for (const r of projects) rows.push({ id: r.id, title: r.title, href: `/change-log/${r.id}`, at: r.created_at, meta: 'No requests yet' })
      return section('changelog', { count: cnt(rq), rows, unlinked: cnt(un) })
    },
    async downloads() {
      const [x, un] = await Promise.all([
        db.from('dl_orders').select('id, buyer_email, downloads, max_downloads, revoked, created_at, dl_products(title)', { count: 'exact' }).eq('user_id', uid).ilike('buyer_email', e).order('created_at', { ascending: false }).limit(WS_ROWS),
        db.from('dl_orders').select('id', head).eq('user_id', uid).is('buyer_email', null),
      ]).then((rs) => rs.map(ok))
      const rows: WsRow[] = keep(x.data, 'buyer_email').map((r: any) => ({ id: r.id, title: r.dl_products?.title || 'Purchase', href: '/digital-downloads/orders', at: r.created_at, meta: `${r.downloads}/${r.max_downloads} downloads${r.revoked ? ' · revoked' : ''}` }))
      return section('downloads', { count: cnt(x), rows, unlinked: cnt(un) })
    },
    async reports() {
      const [c, un] = await Promise.all([
        db.from('rp_clients').select('id, name, email').eq('user_id', uid).ilike('email', e).limit(IDS_LIMIT),
        db.from('rp_clients').select('id', head).eq('user_id', uid).is('email', null),
      ]).then((rs) => rs.map(ok))
      const clients = keep(c.data, 'email')
      const ids = clients.map((r: any) => r.id)
      const rp = ids.length ? ok(await db.from('rp_reports').select('id, client_id, title, month, shared, updated_at', { count: 'exact' }).eq('user_id', uid).in('client_id', ids).order('month', { ascending: false }).limit(WS_ROWS)) : { data: [], count: 0 }
      const rows: WsRow[] = (rp.data || []).map((r: any) => ({ id: r.id, title: r.title, href: `/reports/${r.client_id}`, at: day(r.month), meta: r.shared ? 'Shared' : 'Draft' }))
      if (!rows.length) for (const r of clients) rows.push({ id: r.id, title: `${r.name} (no reports yet)`, href: `/reports/${r.id}`, at: null })
      return section('reports', { count: cnt(rp), rows, unlinked: cnt(un) })
    },
    async emaillist() {
      const s = ok(await db.from('el_subscribers').select('id, email, status, created_at, updated_at').eq('user_id', uid).ilike('email', e).limit(1))
      const sub = keep(s.data, 'email')[0]
      const status = sub ? (sub.status === 'subscribed' ? 'Subscribed' : sub.status === 'pending' ? 'Pending confirmation' : 'Unsubscribed') : null
      const rows: WsRow[] = sub ? [{ id: sub.id, title: status!, href: '/email-list', at: sub.updated_at || sub.created_at }] : []
      return section('emaillist', { count: sub ? 1 : 0, rows, status })
    },
  }

  return Promise.all(tools.map((t) => loaders[t]().catch((err) => { console.error('[client-workspace]', t, err?.message); return section(t, {}) })))
}
