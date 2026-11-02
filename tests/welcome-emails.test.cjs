const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const W = jiti('../lib/welcome/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const DAY = 86400000

test('off by default; dry run unless DRY_RUN is exactly false; live needs start date, sender and key', () => {
  assert.equal(W.welcomeMode({}).enabled, false); assert.equal(W.welcomeMode({}).live, false)
  assert.equal(W.welcomeMode({ WELCOME_EMAILS_ENABLED: '1' }).enabled, false)
  assert.equal(W.welcomeMode({ WELCOME_EMAILS_ENABLED: 'true' }).live, false)
  const full = { WELCOME_EMAILS_ENABLED: 'true', WELCOME_EMAILS_DRY_RUN: 'false', WELCOME_EMAILS_START_AT: '2026-11-10T00:00:00Z', WELCOME_EMAIL_FROM: 'x@saasnation.site', RESEND_API_KEY: 'k' }
  assert.equal(W.welcomeMode(full).live, true)
  for (const k of ['WELCOME_EMAILS_START_AT', 'WELCOME_EMAIL_FROM', 'RESEND_API_KEY']) assert.equal(W.welcomeMode({ ...full, [k]: '' }).live, false, k)
  assert.equal(W.welcomeMode({ ...full, WELCOME_EMAILS_DRY_RUN: '' }).live, false)
  assert.ok(!/^WELCOME_EMAILS_ENABLED=\S/m.test(read('.env.example')))
})

test('only self-signed-up, confirmed, non-invited accounts created after the start date', () => {
  const start = new Date('2026-11-10T00:00:00Z')
  const u = { id: 'a', email: 'a@x.co', created_at: '2026-11-11T00:00:00Z', email_confirmed_at: '2026-11-11T00:01:00Z' }
  assert.equal(W.selfSignedUp(u, start), true)
  assert.equal(W.selfSignedUp(u, null), false)
  assert.equal(W.selfSignedUp({ ...u, created_at: '2026-11-01T00:00:00Z' }, start), false)
  assert.equal(W.selfSignedUp({ ...u, email_confirmed_at: null }, start), false)
  assert.equal(W.selfSignedUp({ ...u, invited_at: '2026-11-11T00:00:00Z' }, start), false)
  assert.equal(W.selfSignedUp({ ...u, is_anonymous: true }, start), false)
  assert.equal(W.selfSignedUp(u, start, () => true), false)
})

test('one step at a time, never repeated, late steps skipped', () => {
  const c = '2026-11-10T00:00:00Z'; const at = (d) => new Date(Date.parse(c) + d * DAY)
  assert.equal(W.dueStep(c, new Set(), at(0.1)), 0)
  assert.equal(W.dueStep(c, new Set([0]), at(0.5)), null)
  assert.equal(W.dueStep(c, new Set([0]), at(2.2)), 2)
  assert.equal(W.dueStep(c, new Set([0, 2]), at(5.1)), 5)
  assert.equal(W.dueStep(c, new Set(), at(5.1)), 5) // missed day 2 is not sent later
  assert.equal(W.dueStep(c, new Set(), at(8)), null)
})

test('templates: unsubscribe link, real prices and refund wording, no invented claims, escaped', () => {
  const { REFUND_PROMISE } = jiti('../lib/site.ts')
  for (const s of W.WELCOME_STEPS) {
    const m = W.renderWelcome(s, { site: 'https://saasnation.site', unsubUrl: W.unsubUrl('https://saasnation.site', 'tok') })
    assert.ok(m.html.includes('/api/welcome/unsubscribe?t=tok') && m.text.includes('/api/welcome/unsubscribe?t=tok'))
    assert.doesNotMatch(m.html + m.text, /24 ?hours|free trial|testimonial|\d+ (customers|users)/i)
    for (const d of (m.text.match(/\$\d+/g) || [])) assert.ok(['$12', '$99', '$29', '$249'].includes(d), d)
  }
  assert.ok(W.renderWelcome(5, { site: 's', unsubUrl: 'u' }).text.toLowerCase().includes(REFUND_PROMISE.toLowerCase()))
})

test('runner: claims before sending, honors opt-out, caps per run, never touches free-tool emails; route needs CRON_SECRET', () => {
  const run = read('lib/welcome/run.ts')
  assert.ok(run.indexOf("from('welcome_email_sends').insert") < run.indexOf('api.resend.com'))
  assert.match(run, /opted_out\) continue/)
  assert.match(run, /MAX_PER_RUN/)
  assert.match(run, /if \(!mode\.live\)/)
  assert.doesNotMatch(run, /free_tool_emails|tool_updates_signups|el_contacts/)
  const route = read('app/api/cron/welcome/route.ts')
  assert.match(route, /if \(!secret/)
  assert.doesNotMatch(route, /export async function GET/)
  const sql = read('supabase/migrations/20261101c_welcome_emails.sql')
  assert.match(sql, /unique \(user_id, step\)/); assert.doesNotMatch(sql, /drop table|drop column|delete from/i)
  assert.equal((sql.match(/force row level security/g) || []).length, 2)
})

test('user listing paginates past the first page', async () => {
  const R = jiti('../lib/welcome/run.ts')
  const pages = [3, 3, 1]; const calls = []
  const db = { auth: { admin: { listUsers: async ({ page, perPage }) => { calls.push(page); const n = pages[page - 1] || 0; return { data: { users: Array.from({ length: n }, (_, i) => ({ id: `${page}-${i}` })) }, error: null } } } } }
  const all = await R.listAllUsers(db, 3)
  assert.equal(all.length, 7); assert.deepEqual(calls, [1, 2, 3])
  await assert.rejects(R.listAllUsers({ auth: { admin: { listUsers: async () => ({ data: null, error: { message: 'x' } }) } } }, 3))
})

test('legacy welcome route retires (410) only when the new sequence is live', () => {
  const src = read('app/api/emails/welcome/route.ts')
  assert.match(src, /welcomeMode\(\)\.live\) return NextResponse\.json\(\{ retired: true \}, \{ status: 410 \}\)/)
  assert.ok(src.indexOf('status: 410') < src.indexOf('sendWelcomeEmail(user.email)'))
})
