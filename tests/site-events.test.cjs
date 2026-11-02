const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const core = jiti('../lib/site-events/core.ts')
const { checkoutSummary } = jiti('../lib/stripe-webhook.ts')
const cap = jiti('../lib/capture/core.ts')
const { upgradeFor } = jiti('../lib/free-tools/upgrade.ts')
const { FREE_TOOLS } = jiti('../lib/free-tools/registry.ts')
const OWN = ['saasnation.site', 'localhost']

test('bots, DNT and GPC are skipped; device is coarse', () => {
  assert.ok(core.isBot('Googlebot/2.1 (+http://www.google.com/bot.html)'))
  assert.ok(core.isBot('curl/8.0'))
  assert.ok(core.isBot(''))
  assert.ok(!core.isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'))
  assert.ok(core.optedOut(new Headers({ dnt: '1' })))
  assert.ok(core.optedOut(new Headers({ 'sec-gpc': '1' })))
  assert.ok(!core.optedOut(new Headers({})))
  assert.equal(core.deviceFromUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile'), 'mobile')
  assert.equal(core.deviceFromUa('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'tablet')
  assert.equal(core.deviceFromUa('Mozilla/5.0 (Macintosh)'), 'desktop')
})

test('daily hash rotates by day, is short hex, and never contains the IP', () => {
  const a = core.dailyVisitorHash('203.0.113.9', 'UA', '2026-11-01', 'p')
  assert.match(a, /^[0-9a-f]{16}$/)
  assert.equal(a, core.dailyVisitorHash('203.0.113.9', 'UA', '2026-11-01', 'p'))
  assert.notEqual(a, core.dailyVisitorHash('203.0.113.9', 'UA', '2026-11-02', 'p'))
  assert.ok(!a.includes('203'))
})

test('referrer keeps only an external host; paths drop query and private pages', () => {
  assert.equal(core.referrerHost('https://www.google.com/search?q=secret', OWN), 'google.com')
  assert.equal(core.referrerHost('https://saasnation.site/pricing', OWN), null)
  assert.equal(core.referrerHost('https://funnels.saasnation.site/x', OWN), null)
  assert.equal(core.referrerHost('not a url', OWN), null)
  assert.equal(core.cleanPath('/pricing?email=a@b.com#x'), '/pricing')
  assert.equal(core.cleanPath('/dashboard/billing'), null)
  assert.equal(core.cleanPath('/i/some-private-token'), null)
  assert.equal(core.cleanPath('/admin'), null)
  assert.equal(core.cleanPath('//evil.com'), null)
  assert.equal(core.cleanPath('/auth/register'), '/auth/register')
})

test('beacon parsing: client events only, server-only events rejected', () => {
  const r = core.parseBeacon({ event: 'pageview', path: '/free-tools/utm-builder?x=1', referrer: 'https://t.co/abc', utm_source: 'X<script>', tool: 'Bad Tool!' }, OWN)
  assert.equal(r.path, '/free-tools/utm-builder'); assert.equal(r.referrer_host, 't.co'); assert.equal(r.utm_source, 'xscript'); assert.equal(r.tool, null)
  assert.equal(core.parseBeacon({ event: 'checkout_completed', path: '/' }, OWN), null)
  assert.equal(core.parseBeacon({ event: 'email_captured', path: '/' }, OWN), null)
  assert.equal(core.parseBeacon({ event: 'nope', path: '/' }, OWN), null)
  assert.equal(core.parseBeacon({ event: 'pageview', path: '/dashboard' }, OWN), null)
  const c = core.parseBeacon({ event: 'checkout_clicked', path: '/dashboard/billing', tool: 'invoices', plan: 'monthly' }, OWN)
  assert.equal(c.path, null); assert.equal(c.tool, 'invoices'); assert.equal(c.plan, 'monthly')
  assert.equal(core.parseBeacon({ event: 'checkout_clicked', path: '/admin/x' }, OWN), null)
  const s = core.parseBeacon({ event: 'signup_started', path: '/auth/register', referrer: 'https://google.com' }, OWN)
  assert.equal(s.referrer_host, null)
})

test('summarize: daily counts and funnel', () => {
  const rows = [
    { day: '2026-11-01', event: 'pageview', visitor_hash: 'a' }, { day: '2026-11-01', event: 'pageview', visitor_hash: 'a' },
    { day: '2026-11-01', event: 'pageview', visitor_hash: 'b' }, { day: '2026-11-01', event: 'free_tool_used', visitor_hash: null },
    { day: '2026-11-02', event: 'pageview', visitor_hash: 'a' }, { day: '2026-11-02', event: 'signup_completed', visitor_hash: null },
    { day: '2026-11-02', event: 'checkout_clicked', visitor_hash: null }, { day: '2026-11-02', event: 'checkout_completed', visitor_hash: null },
    { day: '2026-11-02', event: 'email_captured', visitor_hash: null },
  ]
  const s = core.summarize(rows)
  assert.equal(s.days[0].day, '2026-11-02')
  assert.equal(s.days[1].visits, 3); assert.equal(s.days[1].visitors, 2)
  assert.deepEqual(s.funnel.map((f) => f.n), [3, 1, 1, 1, 1])
  assert.equal(s.emails, 1)
})

test('checkout summary carries only tool / plan / amount', () => {
  const out = checkoutSummary({ amount_total: 1200, payment_link: 'plink_1', customer_details: { email: 'x@y.z' } }, 'invoices', { plink_1: { tool: 'invoices', plan: 'monthly' } })
  assert.deepEqual(out, { tool: 'invoices', plan: 'monthly', amount_cents: 1200 })
  assert.deepEqual(Object.keys(out).sort(), ['amount_cents', 'plan', 'tool'])
})

test('email capture helpers: normalize, known tools only, consent text present', () => {
  assert.equal(cap.normalizeEmail('  Me@Example.COM '), 'me@example.com')
  assert.equal(cap.normalizeEmail('nope'), null)
  assert.equal(cap.cleanSourceTool('late-invoice-kit'), 'late-invoice-kit')
  assert.equal(cap.cleanSourceTool('../x'), null)
  assert.ok(cap.CAPTURE_CONSENT_TEXT.length < 500 && /unsubscribe/i.test(cap.CAPTURE_CONSENT_TEXT))
})

test('every free tool has an honest upgrade card with the locked prices', () => {
  for (const t of FREE_TOOLS) {
    const u = upgradeFor(t.slug)
    assert.notEqual(u.toolName, 'Each tool', t.slug)
    assert.match(u.priceNote, /\$12\/mo or \$99\/yr/); assert.match(u.priceNote, /\$29\/mo or \$249\/yr/)
    assert.ok(!/24 ?h|hours/i.test(u.body + u.priceNote))
  }
  assert.equal(upgradeFor('late-invoice-kit').toolName, 'Invoices')
})

test('routes: capture sends no email and the migration is additive and locked down', () => {
  const route = fs.readFileSync(path.join(root, 'app/api/free-tools/email/route.ts'), 'utf8')
  assert.ok(!/resend|sendEmail|lib\/email/i.test(route))
  assert.match(route, /rateLimit/); assert.match(route, /verifyTurnstile/)
  const beacon = fs.readFileSync(path.join(root, 'app/api/e/route.ts'), 'utf8')
  assert.match(beacon, /rateLimit/); assert.match(beacon, /optedOut/); assert.match(beacon, /isBot/)
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261101a_site_events_and_tool_emails.sql'), 'utf8')
  assert.ok(!/\bdrop\s+(table|column)\b|\btruncate\b|\bdelete\s+from\b/i.test(sql))
  for (const t of ['site_events', 'free_tool_emails']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}`))
    assert.match(sql, new RegExp(`force row level security`))
    assert.match(sql, new RegExp(`revoke all on public\\.${t} from public, anon, authenticated`))
  }
  assert.ok(!/\bip\b|ip_address|user_agent/i.test(sql.split('\n').filter((l) => !l.startsWith('--')).join('\n')))
})
