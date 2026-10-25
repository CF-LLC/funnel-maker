const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const E = jiti('../lib/booking/email.ts')

const m = { id: '11111111-1111-4111-8111-111111111111', start: '2026-10-27T15:00:00.000Z', end: '2026-10-27T15:15:00.000Z', typeName: '15-minute intro call', durationMin: 15, location: 'Zoom',
  hostName: 'Cooper <b>', hostEmail: 'host@example.com', hostTz: 'America/Chicago', handle: 'cooper', typeSlug: '15-minute-intro-call',
  bookerName: 'Ana "<script>"', bookerEmail: 'ana@example.com', bookerTz: 'Europe/London', notes: 'Hi\n<img src=x>' }

test('booker confirmation: both time zones, escaped, calendar + reply links, plain text', () => {
  const r = E.renderBookerConfirmation(m)
  assert.match(r.subject, /^Confirmed: 15-minute intro call with Cooper <b> on Tuesday, October 27 at 3:00 PM$/)
  assert.ok(r.html.includes('3:00 PM') && r.html.includes('10:00 AM'), 'booker (London) and host (Chicago) times')
  assert.ok(!r.html.includes('<script>') && !r.html.includes('<b>') && r.html.includes('&lt;b&gt;'))
  assert.ok(r.html.includes('calendar.google.com/calendar/render') && r.html.includes('mailto:host@example.com'))
  assert.ok(r.text.includes('10:00 AM') && r.text.includes('attached') && !r.text.includes('<td'))
})

test('host notification: booker details, notes escaped, manage link', () => {
  const r = E.renderHostNotification(m)
  assert.ok(r.subject.startsWith('New booking: Ana'))
  assert.ok(r.html.includes('10:00 AM') && r.html.includes('ana@example.com') && r.html.includes('https://saasnation.site/booking'))
  assert.ok(r.html.includes('&lt;img src=x&gt;') && !r.html.includes('<img src=x>'))
  assert.ok(r.text.includes('Notes: Hi') && r.text.includes('Manage or cancel: https://saasnation.site/booking'))
})

test('cancellation: rebook link', () => {
  const r = E.renderCancellation(m)
  assert.ok(r.subject.startsWith('Cancelled:'))
  assert.ok(r.html.includes('https://saasnation.site/@cooper/book/15-minute-intro-call') && r.text.includes('cancelled'))
})

test('payload: from env, reply_to, ics attachment, no header injection in subject', () => {
  process.env.BOOKING_EMAIL_FROM = 'SaaS Nation <bookings@saasnation.site>'
  const p = E.resendPayload({ subject: 'a\r\nBcc: x@y.z', html: '<p>', text: 't', to: 'ana@example.com', replyTo: 'host@example.com', attachments: [{ filename: 'invite.ics', content: 'QQ==' }] })
  assert.equal(p.from, 'SaaS Nation <bookings@saasnation.site>'); assert.deepEqual(p.to, ['ana@example.com']); assert.equal(p.reply_to, 'host@example.com')
  assert.equal(p.subject, 'a Bcc: x@y.z'); assert.equal(p.attachments[0].filename, 'invite.ics')
})

test('sending: no key = no request; key = one POST each; failures never throw', async () => {
  delete process.env.RESEND_API_KEY
  let calls = 0
  const ok = async () => { calls++; return new Response('{}', { status: 200 }) }
  assert.deepEqual(await E.sendBookingCreated(m, ok), { booker: false, host: false }); assert.equal(calls, 0)
  process.env.RESEND_API_KEY = 're_test_dummy'
  const sent = []
  const rec = async (url, init) => { sent.push(JSON.parse(init.body)); assert.equal(url, 'https://api.resend.com/emails'); return new Response('{}', { status: 200 }) }
  assert.deepEqual(await E.sendBookingCreated(m, rec), { booker: true, host: true })
  assert.equal(sent.length, 2)
  const booker = sent.find((s) => s.to[0] === 'ana@example.com'), host = sent.find((s) => s.to[0] === 'host@example.com')
  assert.equal(booker.reply_to, 'host@example.com'); assert.equal(host.reply_to, 'ana@example.com')
  assert.match(Buffer.from(booker.attachments[0].content, 'base64').toString(), /BEGIN:VEVENT[\s\S]*DTSTART:20261027T150000Z/)
  assert.equal(await E.sendBookingCancelled(m, async () => new Response('nope', { status: 500 })), false)
  assert.equal(await E.sendBookingCancelled(m, async () => { throw new Error('network') }), false)
  delete process.env.RESEND_API_KEY
})

test('booking route keeps bot check, rate limits by email, and skips email in demo', () => {
  const src = require('node:fs').readFileSync(path.join(root, 'app/api/booking/book/route.ts'), 'utf8')
  assert.ok(src.includes('verifyTurnstile') && src.includes('book-email:'))
  assert.ok(src.indexOf('if (demo) return') < src.indexOf('notifyBookingCreated(data.id)'))
})
