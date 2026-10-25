const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/dataremoval/core.ts')
const { BROKERS, VISIBLE_BROKERS } = jiti('../lib/dataremoval/brokers.ts')
const reg = jiti('../tools/registry.ts')
const { parsePriceMap } = jiti('../lib/stripe-webhook.ts')

test('registered, sold separately, protected tracker, public landing', () => {
  const t = reg.getTool('dataremoval'); assert.equal(t.accessKey, 'dataremoval')
  assert.ok(reg.SOLD_ACCESS_KEYS.includes('dataremoval'))
  assert.ok(reg.isProtectedPath('/data-removal/tracker')); assert.ok(!reg.isProtectedPath('/data-removal'))
  assert.ok(!reg.isProtectedPath('/privacy'))
  assert.equal(parsePriceMap(JSON.stringify({ p: { tool: 'dataremoval' } })).p.tool, 'dataremoval')
  assert.ok(reg.HOME_ROWS.some((r) => r.id === 'everyone')); assert.deepEqual(reg.toolsInRow('everyone').map((x) => x.id), ['dataremoval'])
})

test('broker data: unique ids, only verified shown, each with https link and date', () => {
  assert.equal(new Set(BROKERS.map((b) => b.id)).size, BROKERS.length)
  assert.equal(VISIBLE_BROKERS.length, 19)
  for (const b of VISIBLE_BROKERS) { assert.ok(b.verified && /^\d{4}-\d{2}-\d{2}$/.test(b.lastChecked)); assert.ok(b.optOutUrl.startsWith('https://')); assert.ok(b.steps.length > 0) }
  for (const b of BROKERS.filter((x) => !x.verified)) assert.equal(b.lastChecked, null)
})

test('status logic', () => {
  assert.ok(C.isStatus('removed') && !C.isStatus('deleted'))
  assert.ok(C.isBrokerId('spokeo') && !C.isBrokerId('nope'))
  assert.equal(C.cleanName('  Jane   Doe '), 'Jane Doe'); assert.equal(C.cleanName(''), null); assert.equal(C.cleanName('x'.repeat(101)), null)
  const b = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
  const s = C.summarize({ a: 'removed', b: 'not_listed', c: 'reappeared', d: 'requested' }, b)
  assert.deepEqual(s, { total: 5, untouched: 1, not_listed: 1, requested: 1, removed: 1, reappeared: 1, done: 2, needsAction: 2 })
})

test('ics: 60 days out, repeating, CRLF, no personal data', () => {
  const ics = C.buildRecheckIcs(new Date('2026-10-25T18:00:00Z'), 'x@y')
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261224')); assert.ok(ics.includes('DTEND;VALUE=DATE:20261225'))
  assert.ok(ics.includes('RRULE:FREQ=DAILY;INTERVAL=60;COUNT=6')); assert.ok(ics.includes('\r\nEND:VCALENDAR'))
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'))
})

test('mailto goes to self only; email templates stay hidden', () => {
  const m = C.buildRecheckMailto('me@x.com', new Date('2026-10-25T18:00:00Z'))
  assert.ok(m.startsWith('mailto:me%40x.com?subject=')); assert.ok(decodeURIComponent(m).includes('2026-12-24'))
  assert.equal(C.EMAIL_TEMPLATES_ENABLED, false)
  for (const b of BROKERS) assert.equal(C.emailTemplateFor(b, { name: 'A' }), null)
})
