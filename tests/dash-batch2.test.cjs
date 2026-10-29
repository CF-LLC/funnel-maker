const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('revenue: empty STRIPE_PRICE_MAP falls back to estimate only, never sums everything', () => {
  const l = read('lib/admin/load.ts')
  const fn = l.slice(l.indexOf('export async function loadRevenue'), l.indexOf('export async function loadFunnel'))
  assert.match(fn, /if \(!Object\.keys\(map\)\.length\) return \{ source: 'estimate'/)
  assert.doesNotMatch(fn, /!Object\.keys\(map\)\.length \|\|/)
})

test('privacy mentions sn_vid; free tools wording stays truthful', () => {
  const p = read('app/privacy/page.tsx')
  for (const w of ['sn_vid', '90 days', 'no email or IP', 'Do Not Track']) assert.ok(p.includes(w), w)
  assert.doesNotMatch(read('app/free-tools/page.tsx'), /store nothing/)
  assert.doesNotMatch(read('lib/free-tools/registry.ts'), /nothing stored/)
})

test('weekly digest is built disabled: no sender anywhere', () => {
  const { buildDigest, DIGEST_ENABLED } = jiti('../lib/digest.ts')
  assert.equal(DIGEST_ENABLED, false)
  assert.equal(buildDigest({ leads: 2, responses: 0, bookings: 1, invoicesPaid: 1, reviews: 0 }).lines.join('|'), '2 new leads|1 booking|1 invoice paid')
  assert.match(buildDigest({ leads: 0, responses: 0, bookings: 0, invoicesPaid: 0, reviews: 0 }).lines[0], /quiet week/)
  for (const f of ['lib/digest.ts', 'app/api/cron/digest/route.ts', 'app/api/me/prefs/route.ts', 'app/dashboard/settings/page.tsx']) assert.doesNotMatch(read(f), /resend|sendEmail|nodemailer|lib\/email/i, f)
  assert.match(read('app/api/cron/digest/route.ts'), /disabled: true/)
})

test('prefs table: additive, own-rows RLS, defaults off', () => {
  const m = read('supabase/migrations/20261028e_user_notification_prefs.sql')
  assert.match(m, /enable row level security/)
  assert.match(m, /user_id = auth\.uid\(\)/)
  assert.equal((m.match(/default false/g) || []).length, 3)
  assert.doesNotMatch(m, /drop table|truncate|delete from/i)
})

test('data export: signed-in only, user session (RLS), own rows', () => {
  const r = read('app/api/me/export/route.ts')
  assert.match(r, /status: 401/)
  assert.doesNotMatch(r, /serviceClient|service_role/)
  assert.match(r, /\.eq\(t\.col, user\.id\)/)
})

test('billing: no new Stripe calls; portal only if configured, else disabled', () => {
  const b = read('app/dashboard/billing/page.tsx')
  assert.doesNotMatch(b, /getStripe|billingPortal/)
  assert.match(b, /data-portal-disabled/)
  assert.match(b, /mailto:/)
})

test('dashboard: results panel, palette, mobile bottom nav, settings link', () => {
  assert.match(read('app/dashboard/page.tsx'), /<ResultsPanel c=\{results\}/)
  const l = read('app/dashboard/layout.tsx')
  assert.match(l, /<CommandPalette/)
  assert.match(l, /data-bottom-nav/)
  assert.match(l, /\/dashboard\/settings/)
})
