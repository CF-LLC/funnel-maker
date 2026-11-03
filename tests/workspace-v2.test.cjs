// PR 1 (SaaS Nation rework): workspace_v2 flag (global + per-user), shared email normalizer,
// client page sections (by email only, access-gated) and flag-off = unchanged page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const E = jiti('../lib/clients/email.ts')
const F = jiti('../lib/flags.ts')
const W = jiti('../lib/clients/workspace-core.ts')
const L = jiti('../lib/clients/workspace.ts')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'

test('email normalizer: trim + lowercase, invalid = null, never by name', () => {
  assert.equal(E.clientEmail('  Maya@Example.COM \n'), 'maya@example.com')
  assert.equal(E.clientEmail('Maya Lopez'), null)
  assert.equal(E.clientEmail(''), null); assert.equal(E.clientEmail(null), null); assert.equal(E.clientEmail(42), null)
  assert.ok(E.sameClient(' A@B.co', 'a@b.CO '))
  assert.ok(!E.sameClient('Maya', 'Maya'))
  assert.ok(!E.sameClient(null, null))
  assert.equal(E.likeExact('a_b%c\\d@x.co'), 'a\\_b\\%c\\\\d@x.co')
})

test('per-user flag rule: off by default, global on, allowlist only for listed users', () => {
  assert.equal(F.flagAllows(null, U1), false)
  assert.equal(F.flagAllows({ enabled: false, allow_users: [] }, U1), false)
  assert.equal(F.flagAllows({ enabled: false, allow_users: [U1] }, U1), true)
  assert.equal(F.flagAllows({ enabled: false, allow_users: [U1] }, U2), false)
  assert.equal(F.flagAllows({ enabled: false, allow_users: [U1] }, null), false)
  assert.equal(F.flagAllows({ enabled: true, allow_users: [] }, U2), true)
  assert.equal(F.flagAllows({ enabled: false, allow_users: null }, U1), false)
})

test('allowlist edit: add dedupes, remove only that id', () => {
  assert.deepEqual(F.editAllowlist([], U1, true), [U1])
  assert.deepEqual(F.editAllowlist([U1], U1, true), [U1])
  assert.deepEqual(F.editAllowlist([U1, U2], U1, false), [U2])
  assert.deepEqual(F.editAllowlist(null, U2, false), [])
})

test('isUserFlagEnabled: uses fm_user_flag RPC, signed out = false, failure = false, cached', async () => {
  let calls = 0
  globalThis.__sb = { user: { id: U1 }, admins: [] }
  const stub = require('./stubs/supabase-stub.cjs')
  const orig = stub.createServerClient
  stub.createServerClient = async () => ({ rpc: async (fn, a) => { calls++; return { data: fn === 'fm_user_flag' && a.flag_key === 'workspace_v2' } } })
  try {
    F._resetUserFlagCache()
    assert.equal(await F.isUserFlagEnabled('workspace_v2', null), false)
    assert.equal(await F.isUserFlagEnabled('workspace_v2', U1), true)
    assert.equal(await F.isUserFlagEnabled('workspace_v2', U1), true)
    assert.equal(calls, 1, 'second read served from cache')
    assert.equal(await F.isUserFlagEnabled('other', U1), false)
    stub.createServerClient = async () => { throw new Error('down') }
    F._resetUserFlagCache()
    assert.equal(await F.isUserFlagEnabled('workspace_v2', U2), false)
  } finally { stub.createServerClient = orig; F._resetUserFlagCache() }
})

test('visible tools follow access; section caps rows and keeps counts', () => {
  assert.deepEqual(W.visibleTools(new Set(['time', 'portal', 'crm'])), ['portal', 'time'])
  assert.deepEqual(W.visibleTools(new Set()), [])
  const rows = Array.from({ length: 9 }, (_, i) => ({ id: 'r' + i, title: 't', href: '/x', at: `2026-10-0${i + 1}T00:00:00Z` }))
  const s = W.section('expenses', { count: 12, rows, unlinked: 3 })
  assert.equal(s.rows.length, W.WS_ROWS); assert.equal(s.rows[0].id, 'r8'); assert.equal(s.count, 12); assert.equal(s.unlinked, 3)
  const empty = W.section('approvals', {})
  assert.equal(empty.count, 0); assert.equal(empty.rows.length, 0); assert.match(empty.empty, /approval/)
})

// Fake PostgREST builder that records filters and applies eq / ilike / is / in to fixture tables.
function fakeDb(tables, log) {
  return {
    from(t) {
      const f = []; let head = false; let lim = Infinity; let order = null; let cols = null
      const q = {
        select(c, o) { if (o?.head) head = true; else if (c && !c.includes('(')) cols = c.split(',').map((x) => x.trim()); return q },
        eq(c, v) { f.push(['eq', c, v]); return q }, ilike(c, v) { f.push(['ilike', c, v]); return q },
        is(c, v) { f.push(['is', c, v]); return q }, in(c, v) { f.push(['in', c, v]); return q },
        order(c, o) { order = [c, o?.ascending]; return q }, limit(n) { lim = n; return q },
        then(res, rej) {
          log.push({ t, f, lim })
          const un = (p) => p.replace(/\\(.)/g, '$1').toLowerCase()
          let rows = (tables[t] || []).filter((r) => f.every(([k, c, v]) => k === 'eq' ? r[c] === v : k === 'ilike' ? typeof r[c] === 'string' && r[c].toLowerCase() === un(v) : k === 'is' ? r[c] == v : v.includes(r[c])))
          if (order) rows = rows.slice().sort((a, b) => (a[order[0]] < b[order[0]] ? 1 : -1))
          const count = rows.length
          const pick = (r) => (cols ? Object.fromEntries(cols.map((k) => [k, r[k]])) : r)
          return Promise.resolve(head ? { data: null, count } : { data: rows.slice(0, lim).map(pick), count }).then(res, rej)
        },
      }
      return q
    },
  }
}

test('loader: links by normalized email only, user-scoped, bounded, counts unlinked, ignores same-name rows', async () => {
  const T = {
    pt_portals: [
      { id: 'p1', user_id: U1, client_name: 'Maya', client_email: 'maya@example.com', revoked: false, view_count: 2, created_at: '2026-10-01' },
      { id: 'p2', user_id: U1, client_name: 'Maya', client_email: null, revoked: false, view_count: 0, created_at: '2026-10-02' },
      { id: 'p3', user_id: U2, client_name: 'Maya', client_email: 'maya@example.com', revoked: false, view_count: 0, created_at: '2026-10-03' },
    ],
    pt_files: [{ id: 'f1', user_id: U1, portal_id: 'p1', name: 'brief.pdf', created_at: '2026-10-02' }],
    ex_expenses: [{ id: 'x1', user_id: U1, crm_email: 'maya@example.com', vendor: 'Figma', amount_cents: 1500, expense_date: '2026-10-05' }, { id: 'x2', user_id: U1, crm_email: null, vendor: 'Maya', amount_cents: 1, expense_date: '2026-10-06' }],
    el_subscribers: [{ id: 's1', user_id: U1, email: 'maya@example.com', status: 'subscribed', created_at: '2026-10-01' }],
    tt_clients: [{ id: 'c1', user_id: U1, name: 'Maya', email: null, crm_email: null }],
  }
  const log = []
  const out = await L.loadClientWorkspace(fakeDb(T, log), U1, '  MAYA@Example.com ', ['portal', 'expenses', 'emaillist', 'time', 'approvals'])
  const by = Object.fromEntries(out.map((s) => [s.tool, s]))
  assert.equal(by.portal.count, 1); assert.equal(by.portal.unlinked, 1); assert.match(by.portal.rows[0].meta, /1 shared file/)
  assert.equal(by.expenses.count, 1); assert.equal(by.expenses.unlinked, 1); assert.equal(by.expenses.rows[0].title, 'Figma')
  assert.equal(by.emaillist.status, 'Subscribed')
  assert.equal(by.time.count, 0, 'same-name time client with no email is not linked'); assert.equal(by.time.unlinked, 1)
  assert.equal(by.approvals.count, 0); assert.equal(by.approvals.rows.length, 0)
  for (const q of log) {
    assert.ok(q.f.some(([k, c, v]) => k === 'eq' && c === 'user_id' && v === U1), `${q.t} is user-scoped`)
    assert.ok(!q.f.some(([, c]) => /name/.test(c)), `${q.t} never filters by name`)
  }
  assert.ok(log.filter((q) => !q.f.some(([k]) => k === 'is')).every((q) => Number.isFinite(q.lim) || q.t === 'pt_files'), 'row queries are limited')
  assert.deepEqual(await L.loadClientWorkspace(fakeDb(T, []), U1, 'Maya', ['portal']), [])
})

test('flag off = page unchanged: workspace only loads behind workspace_v2, ContactDetail renders it only when passed', () => {
  const page = read('app/crm/[contactId]/page.tsx')
  assert.match(page, /if \(!demo && \(await isUserFlagEnabled\('workspace_v2', user!\.id\)\)\)/)
  assert.match(page, /let workspace: WsSection\[\] \| undefined\n/)
  const cd = read('components/crm/contact-detail.tsx')
  assert.match(cd, /\{workspace && <ClientWorkspace sections=\{workspace\} \/>\}/)
})

test('render: flag off markup has no workspace section; flag on shows sections, empty state and unlinked hint', async () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { transform } = require('sucrase')
  const tsx = require('jiti')(__filename, { alias: { '@': root }, cache: false, extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'], transform: (o) => ({ code: transform(o.source, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic', filePath: o.filename }).code }) })
  const { ContactDetail } = tsx('../components/crm/contact-detail.tsx')
  const contact = { email: 'maya@example.com', name: 'Maya', phone: '', company: '', status: 'lead', tags: [], followUpOn: null, sources: [], counts: { form: 0, booking: 0, proposal: 0, invoice: 0 }, firstSeen: '2026-10-01T00:00:00Z', lastActivity: '2026-10-01T00:00:00Z', invoicedCents: 0, paidCents: 0, currency: null, saved: true }
  const base = { contact, activities: [], notes: [], demo: false }
  const off = renderToStaticMarkup(React.createElement(ContactDetail, base))
  assert.equal(off, renderToStaticMarkup(React.createElement(ContactDetail, { ...base, workspace: undefined })))
  assert.doesNotMatch(off, /client-workspace|Across your tools/)
  const on = renderToStaticMarkup(React.createElement(ContactDetail, { ...base, workspace: [W.section('approvals', { unlinked: 2 }), W.section('expenses', { count: 1, rows: [{ id: 'x', title: 'Figma', href: '/expenses', at: '2026-10-05T12:00:00Z' }] })] }))
  assert.match(on, /Across your tools/); assert.match(on, /Nothing sent for approval yet/); assert.match(on, /2 with no email · Add an email to link/); assert.match(on, /Figma/)
  assert.ok(on.startsWith(off.slice(0, off.length - '</div>'.length)), 'flag-on markup = flag-off markup + appended section')
})

test('migration: additive, per-user flag function, default off, rollback documented', () => {
  const m = read('supabase/migrations/20261102a_workspace_v2_flag.sql')
  const live = m.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(live, /\bdrop\b|\bdelete\b|\btruncate\b|alter column|rename/i)
  assert.match(live, /add column if not exists allow_users uuid\[\] not null default '\{\}'/)
  assert.match(live, /values \('workspace_v2', false,/)
  assert.match(live, /security definer set search_path = public/)
  assert.match(live, /grant execute on function public\.fm_user_flag\(text\) to authenticated;/)
  assert.match(live, /revoke execute on function public\.fm_user_flag\(text\) from anon;/)
  assert.match(m, /-- Rollback/); assert.match(m, /--\s+drop function if exists public\.fm_user_flag/)
})

test('admin flags route: allowlist edit is guarded, validated and audited', () => {
  const s = read('app/api/admin/flags/route.ts')
  assert.match(s, /UUID_RE\.test\(b\.userId\)/)
  assert.match(s, /audit\(adminId, 'flag\.allow'/)
})
