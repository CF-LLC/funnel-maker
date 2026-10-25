const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const B = jiti('../lib/booking/core.ts')
const reg = jiti('../tools/registry.ts')
const { parsePriceMap } = jiti('../lib/stripe-webhook.ts')

const type = { duration_min: 30, buffer_before: 0, buffer_after: 0, min_notice_min: 0, max_days_ahead: 7 }
// Monday 2026-10-26 08:00 America/Chicago (CDT, UTC-5) = 13:00Z
const now = Date.parse('2026-10-26T13:00:00Z')

test('booking tool registered, sold separately, in price map and access keys', () => {
  const t = reg.getTool('booking'); assert.equal(t.route, '/booking'); assert.equal(t.accessKey, 'booking')
  assert.ok(reg.SOLD_ACCESS_KEYS.includes('booking')); assert.ok(reg.isProtectedPath('/booking/types'))
  assert.ok(!reg.isProtectedPath('/u/coach/book'))
  assert.equal(parsePriceMap(JSON.stringify({ price_x: { tool: 'booking' } })).price_x.tool, 'booking')
})

test('zonedTime handles CDT and CST', () => {
  assert.equal(new Date(B.zonedTime(2026, 10, 26, 9 * 60, 'America/Chicago')).toISOString(), '2026-10-26T14:00:00.000Z')
  assert.equal(new Date(B.zonedTime(2026, 11, 2, 9 * 60, 'America/Chicago')).toISOString(), '2026-11-02T15:00:00.000Z')
  assert.equal(new Date(B.zonedTime(2026, 10, 26, 9 * 60, 'Europe/London')).toISOString(), '2026-10-26T09:00:00.000Z')
})

test('slots: inside weekly window, in owner time zone, every 30 min', () => {
  const weekly = [{ weekday: 1, start_min: 9 * 60, end_min: 11 * 60 }]
  const s = B.generateSlots({ tz: 'America/Chicago', weekly, type, blocks: [], now, days: 0 })
  assert.deepEqual(s.map((x) => x.start), ['2026-10-26T14:00:00.000Z', '2026-10-26T14:30:00.000Z', '2026-10-26T15:00:00.000Z', '2026-10-26T15:30:00.000Z'])
  assert.equal(s[0].end, '2026-10-26T14:30:00.000Z')
})

test('slots: min notice, max days ahead, wrong weekday', () => {
  const weekly = [{ weekday: 1, start_min: 9 * 60, end_min: 11 * 60 }]
  const s = B.generateSlots({ tz: 'America/Chicago', weekly, type: { ...type, min_notice_min: 90 }, blocks: [], now, days: 0 })
  assert.equal(s[0].start, '2026-10-26T14:30:00.000Z')
  const week = B.generateSlots({ tz: 'America/Chicago', weekly, type: { ...type, max_days_ahead: 8 }, blocks: [], now })
  assert.equal(week.length, 8) // this Monday and next Monday (CST after Nov 1)
  assert.equal(week[4].start, '2026-11-02T15:00:00.000Z')
  assert.equal(B.generateSlots({ tz: 'America/Chicago', weekly: [{ weekday: 2, start_min: 0, end_min: 60 }], type, blocks: [], now, days: 0 }).length, 0)
})

test('slots: existing bookings and buffers remove overlapping slots', () => {
  const weekly = [{ weekday: 1, start_min: 9 * 60, end_min: 11 * 60 }]
  const booked = B.blockFor('2026-10-26T14:30:00.000Z', { ...type, buffer_after: 15 })
  const s = B.generateSlots({ tz: 'America/Chicago', weekly, type, blocks: [booked], now, days: 0 }).map((x) => x.start)
  assert.deepEqual(s, ['2026-10-26T14:00:00.000Z', '2026-10-26T15:30:00.000Z'])
  const withBefore = B.generateSlots({ tz: 'America/Chicago', weekly, type: { ...type, buffer_before: 10 }, blocks: [B.blockFor('2026-10-26T14:00:00.000Z', type)], now, days: 0 }).map((x) => x.start)
  assert.ok(!withBefore.includes('2026-10-26T14:00:00.000Z'))
})

test('double booking: overlap mirrors the database exclusion constraint', () => {
  const a = B.blockFor('2026-10-26T14:00:00.000Z', type)
  assert.ok(B.overlaps(a, B.blockFor('2026-10-26T14:15:00.000Z', type)))
  assert.ok(!B.overlaps(a, B.blockFor('2026-10-26T14:30:00.000Z', type)), 'back-to-back is allowed ([) range)')
  assert.ok(B.overlaps(a, B.blockFor('2026-10-26T14:30:00.000Z', { ...type, buffer_before: 5 })))
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261025_booking.sql'), 'utf8')
  assert.match(sql, /exclude using gist \(user_id with =, tstzrange\(block_start, block_end, '\[\)'\) with &&\) where \(status = 'confirmed'\)/)
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i)
})

test('validation and ics', () => {
  assert.ok(B.isValidTimeZone('America/Chicago')); assert.ok(!B.isValidTimeZone('Mars/Base'))
  assert.equal(B.weeklySchema.safeParse([{ weekday: 1, start_min: 600, end_min: 540 }]).success, false)
  assert.equal(B.labelToMin('09:30'), 570); assert.equal(B.labelToMin('25:00'), null); assert.equal(B.minToLabel(570), '09:30')
  assert.equal(B.bookSchema.safeParse({ handle: 'a', type: 'b', start: '2026-10-26T14:00:00.000Z', name: 'X', email: 'bad' }).success, false)
  const ics = B.buildIcs({ uid: 'u1', start: '2026-10-26T14:00:00.000Z', end: '2026-10-26T14:30:00.000Z', title: 'Call, with; Coach', now: '2026-10-24T00:00:00.000Z' })
  assert.match(ics, /DTSTART:20261026T140000Z\r\n/); assert.match(ics, /SUMMARY:Call\\, with\\; Coach/); assert.match(ics, /^BEGIN:VCALENDAR/)
  assert.equal(B.bookPath('coach', 'intro'), '/@coach/book/intro')
})
