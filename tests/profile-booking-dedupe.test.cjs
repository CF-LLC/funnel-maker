const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { dedupeBooking, isBookingItem } = jiti('../lib/linkinbio/core.ts')

const links = [{ title: 'Book a call', url: 'https://x.com/cal' }, { title: 'My shop', url: 'https://shop.example' }, { title: 'Schedule', url: 'https://saasnation.site/@me/book' }]
const funnels = [{ name: 'Book a call', slug: 'book-a-call', template: 'book-call' }, { name: 'Intro', slug: 'consult', template: 'book-call' }, { name: 'Free guide', slug: 'guide', template: 'lead-magnet' }]

test('booking shown: booking funnels and links dropped, others kept', () => {
  const r = dedupeBooking(true, links, funnels)
  assert.deepEqual(r.links.map((l) => l.title), ['My shop'])
  assert.deepEqual(r.funnels.map((f) => f.slug), ['guide'])
})
test('booking not shown: nothing removed', () => {
  const r = dedupeBooking(false, links, funnels)
  assert.equal(r.links.length, 3); assert.equal(r.funnels.length, 3)
})
test('isBookingItem does not over-match', () => {
  assert.ok(!isBookingItem({ title: 'Bookshelf tour', url: 'https://a.com/books' }))
  assert.ok(!isBookingItem({ name: 'Facebook ads course', slug: 'facebook' }))
  assert.ok(isBookingItem({ title: 'book a session', url: 'https://a.com' }))
})
test('profile page renders one Booking button labelled "Book a call" and uses deduped lists', () => {
  const src = require('node:fs').readFileSync(path.join(root, 'app/u/[handle]/page.tsx'), 'utf8')
  assert.match(src, /dedupeBooking\(showBooking/); assert.ok(!src.includes('page.funnels.map')); assert.ok(!src.includes('page.links.map'))
  assert.match(src, />Book a call</)
})
