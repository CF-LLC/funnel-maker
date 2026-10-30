// Email list: validation, CSV, rendering (footer + unsubscribe), every send gate, stats, launch flag, migration shape.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/emaillist/core.ts')
const S = jiti('../lib/emaillist/send.ts')
const reg = jiti('../tools/registry.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('emails, tags and slugs are normalised', () => {
  assert.equal(C.normEmail('  Ana@Example.COM '), 'ana@example.com')
  for (const bad of ['', 'x', 'a@b', 'a b@c.com', '<a@b.com>', null]) assert.equal(C.normEmail(bad), null)
  assert.deepEqual(C.normTags('VIP, #Launch,vip, '), ['vip', 'launch'])
  assert.ok(C.validSlug('my-list')); assert.ok(!C.validSlug('demo-coach')); assert.ok(!C.validSlug('unsubscribe')); assert.ok(!C.validSlug('-x-')); assert.ok(!C.validSlug('ab'))
})

test('CSV import finds the email column, dedupes and counts skips', () => {
  const r = C.csvToRows('Name,E-mail,Tags\n"Lopez, Maya",maya@example.com,"vip;beta"\nSam,SAM@x.org,\nBad,nope,\nDup,maya@example.com,', ['launch'])
  assert.equal(r.rows.length, 2); assert.equal(r.skipped, 1); assert.equal(r.duplicates, 1)
  assert.equal(r.rows[0].name, 'Lopez, Maya'); assert.ok(r.rows[0].tags.includes('launch'))
  assert.equal(r.rows[1].email, 'sam@x.org')
})

test('rendered broadcast escapes HTML and always has unsubscribe + mailing address', () => {
  const s = { ...C.DEFAULT_SETTINGS, from_name: 'Ana <script>', mailing_address: '1 Main St, Austin TX' }
  const r = C.renderBroadcast({ subject: 'Hi', preheader: 'p', body: 'Hello **there** <img src=x>\n\n[site](https://ex.com)\n[bad](javascript:alert(1))' }, s, 'https://saasnation.site/e/unsubscribe/t?b=1')
  assert.ok(!r.html.includes('<script>')); assert.ok(!r.html.includes('<img')); assert.ok(!/href="javascript/i.test(r.html))
  assert.match(r.html, /<strong[^>]*>there<\/strong>/); assert.ok(r.html.includes('https://saasnation.site/e/unsubscribe/t?b=1'))
  assert.ok(r.html.includes('1 Main St, Austin TX')); assert.match(r.text, /Unsubscribe: https:\/\/saasnation\.site\/e\/unsubscribe\/t/)
  assert.match(r.text, /1 Main St, Austin TX/)
})

test('list emails carry RFC 8058 one-click unsubscribe headers', () => {
  const p = S.listPayload({ subject: 's', html: 'h', text: 't', to: 'a@b.co', unsubUrl: 'https://u/1', oneClickUrl: 'https://u/api?t=1' }, '"A via SaaS Nation" <lists@saasnation.site>', null)
  assert.match(p.headers['List-Unsubscribe'], /^<https:\/\/u\/api\?t=1>/)
  assert.equal(p.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.match(S.fromHeader('Ana "x"'), /via SaaS Nation/)
})

const base = () => ({
  demo: false, envEnabled: true, resendConfigured: true, sentLast24h: 0, recipients: 5, confirmText: 'SEND',
  settings: { ...C.DEFAULT_SETTINGS, from_name: 'Ana', mailing_address: 'PO Box 1', sending_enabled: true },
  broadcast: { status: 'draft', subject: 'Hi', body: 'Body' },
})
test('send gate: only passes when every condition holds', () => {
  assert.deepEqual(C.sendGate(base()), { ok: true })
  const fail = (o, code) => assert.equal(C.sendGate({ ...base(), ...o }).code, code)
  fail({ demo: true }, 'demo')
  fail({ broadcast: { status: 'sent', subject: 'Hi', body: 'b' } }, 'state')
  fail({ broadcast: { status: 'draft', subject: ' ', body: 'b' } }, 'empty')
  fail({ settings: { ...base().settings, mailing_address: '' } }, 'settings')
  fail({ settings: { ...base().settings, from_name: null } }, 'settings')
  fail({ settings: { ...base().settings, sending_enabled: false } }, 'demo')
  fail({ envEnabled: false }, 'disabled')
  fail({ resendConfigured: false }, 'disabled')
  fail({ recipients: 0 }, 'empty')
  fail({ sentLast24h: 196 }, 'cap')
  fail({ confirmText: 'send' }, 'confirm')
  fail({ confirmText: undefined }, 'confirm')
})
test('sending is off unless EMAILLIST_SEND_ENABLED is set', () => {
  assert.equal(C.sendingEnvEnabled({}), false); assert.equal(C.sendingEnvEnabled({ EMAILLIST_SEND_ENABLED: 'yes' }), false)
  assert.equal(C.sendingEnvEnabled({ EMAILLIST_SEND_ENABLED: 'true' }), true)
  assert.equal(C.DEFAULT_SETTINGS.sending_enabled, false); assert.equal(C.DEFAULT_SETTINGS.double_opt_in, true)
})

test('recipients and stats', () => {
  const subs = [
    { status: 'subscribed', tags: ['vip'], created_at: new Date().toISOString(), unsubscribed_at: null, unsub_broadcast_id: null },
    { status: 'subscribed', tags: [], created_at: new Date().toISOString(), unsubscribed_at: null, unsub_broadcast_id: null },
    { status: 'pending', tags: ['vip'], created_at: new Date().toISOString(), unsubscribed_at: null, unsub_broadcast_id: null },
    { status: 'unsubscribed', tags: ['vip'], created_at: '2026-01-01T00:00:00Z', unsubscribed_at: new Date().toISOString(), unsub_broadcast_id: 'b1' },
  ]
  assert.equal(C.recipientsFor(subs, null).length, 2); assert.equal(C.recipientsFor(subs, 'vip').length, 1)
  const st = C.listStats(subs)
  assert.equal(st.subscribed, 2); assert.equal(st.pending, 1); assert.equal(st.unsub30, 1); assert.deepEqual(st.unsubsByBroadcast, { b1: 1 })
  assert.equal(st.signups.length, 30); assert.equal(st.signups[29], 3)
})

test('email list is hidden until its launch flag is on', () => {
  const t = reg.TOOL_REGISTRY.find((x) => x.id === 'emaillist')
  assert.equal(t.launchFlag, 'emaillist'); assert.equal(t.route, '/email-list')
  assert.ok(!reg.publicTools({ crm: true, emaillist: false }).some((x) => x.id === 'emaillist'))
  assert.ok(reg.publicTools({ crm: true, emaillist: true }).some((x) => x.id === 'emaillist'))
  const pp = read('components/pricing-plans.tsx')
  assert.match(pp, /\{ id: 'emaillist', name: 'Email list' \}/)
  assert.match(pp, /GATED: readonly string\[\] = \['crm', 'emaillist', 'downloads', 'portal', 'approvals', 'changelog', 'time'\]/)
  assert.match(pp, /!GATED\.includes\(t\.id\) \|\| flags\[FLAG_OF\[t\.id\] \|\| t\.id\]/)
})

test('migration is additive, RLS on, consent guarded, tokens hidden, flag seeded off', () => {
  const m = read('supabase/migrations/20261027b_emaillist.sql')
  assert.ok(!/\bdrop\s+table\b/i.test(m)); assert.ok(!/\btruncate\b/i.test(m))
  for (const t of ['el_settings', 'el_subscribers', 'el_broadcasts', 'el_sends']) assert.match(m, new RegExp(`alter table public\\.${t} enable row level security`, 'i'))
  assert.match(m, /function public\.el_has_access\(uid uuid\)[\s\S]*security definer/i)
  assert.match(m, /owner_attested/); assert.match(m, /revoke all on [^;]*public\.el_subscribers[^;]* from anon/i)
  assert.ok(!/grant select \([^)]*confirm_token/i.test(m))
  assert.match(m, /'emaillist_public', false/)
})

test('no route sends without the gate; public routes never use the owner session', () => {
  const send = read('app/api/emaillist/broadcasts/[id]/send/route.ts')
  assert.ok(send.indexOf('sendGate(') < send.indexOf('sendBatch('))
  const tst = read('app/api/emaillist/broadcasts/[id]/test/route.ts')
  assert.match(tst, /sending_enabled/); assert.match(tst, /sendingEnvEnabled\(\)/)
  const pub = read('lib/emaillist/public.ts')
  assert.ok(pub.indexOf('canSendConfirm(') < pub.indexOf('sendBatch('))
})
