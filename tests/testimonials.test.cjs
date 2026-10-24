const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const T = jiti('../lib/testimonials/core.ts')
const F = jiti('../lib/forms/core.ts')
const reg = jiti('../tools/registry.ts')
const { parsePriceMap } = jiti('../lib/stripe-webhook.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('testimonials tool: registered, sold separately, protected, price map accepts it', () => {
  const t = reg.getTool('testimonials'); assert.equal(t.route, '/testimonials'); assert.equal(t.accessKey, 'testimonials')
  assert.ok(reg.SOLD_ACCESS_KEYS.includes('testimonials')); assert.ok(!reg.isIncludedTool('testimonials'))
  assert.ok(reg.isProtectedPath('/testimonials')); assert.ok(!reg.isProtectedPath('/u/coop/review'))
  assert.equal(parsePriceMap(JSON.stringify({ plink_x: { tool: 'testimonials' } })).plink_x.tool, 'testimonials')
})

test('owner actions: approve, hide, unapprove; never delete', () => {
  assert.deepEqual(T.actionsFor('pending'), ['approve', 'hide'])
  assert.deepEqual(T.actionsFor('approved'), ['unapprove', 'hide'])
  assert.deepEqual(T.actionsFor('hidden'), ['unhide', 'approve'])
  assert.ok(!Object.keys(T.ACTIONS).some((a) => /delete/i.test(a)))
  assert.equal(T.ACTIONS.unapprove, 'pending')
})

test('submission schema: name, optional role, 1-5 rating, feedback', () => {
  const ok = { handle: 'coop', name: 'Jane', role: '', rating: '5', body: 'Great coach, very clear.' }
  const r = T.submitSchema.parse(ok); assert.equal(r.rating, 5); assert.equal(r.role, null)
  for (const bad of [{ rating: '0' }, { rating: '6' }, { rating: '4.5' }, { name: ' ' }, { body: 'short' }, { body: 'x'.repeat(2001) }, { role: 'x'.repeat(101) }])
    assert.equal(T.submitSchema.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad))
})

test('photos: magic-byte sniffing, 2 MB limit', () => {
  assert.equal(T.sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg')
  assert.equal(T.sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(T.sniffImage(new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])), 'image/webp')
  assert.equal(T.sniffImage(new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))), null)
  assert.equal(T.sniffImage(new Uint8Array(Buffer.from('GIF89a'))), null)
  assert.equal(T.PHOTO_MAX_BYTES, 2 * 1024 * 1024)
})

test('funnel embed path parsing and reserved form names', () => {
  assert.equal(T.testimonialsEmbedSrc('/@Coop/reviews'), '/u/coop/reviews?embed=1&layout=grid')
  assert.equal(T.testimonialsEmbedSrc('https://saasnation.site/@coop/reviews?layout=quote'), '/u/coop/reviews?embed=1&layout=quote')
  assert.equal(T.testimonialsEmbedSrc('https://evil.com/@coop/reviews'), undefined)
  assert.equal(T.testimonialsEmbedSrc('/@coop/review'), undefined)
  assert.equal(T.testimonialsEmbedSrc('/@coop/reviews?layout=<x>'), undefined)
  const form = { slug: 'review', title: 'x', description: '', submit_label: 'Go', fields: [], published: true }
  assert.equal(F.formSchema.safeParse(form).success, false)
  assert.equal(F.formSchema.safeParse({ ...form, slug: 'reviews' }).success, false)
  assert.equal(F.formSchema.safeParse({ ...form, slug: 'contact' }).success, true)
  assert.equal(T.reviewFormPath('coop'), '/@coop/review'); assert.equal(T.reviewWallPath('coop'), '/@coop/reviews')
})

test('migration is additive, gates in the DB, private photo bucket, no deletes', () => {
  const sql = read('supabase/migrations/20261024_testimonials.sql')
  assert.match(sql, /'funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'testimonials', 'all'/)
  assert.match(sql, /tool in \('testimonials', 'all'\) and active/)
  assert.match(sql, /public\.tst_has_access\(auth\.uid\(\)\)/)
  assert.match(sql, /'tst-photos', 'tst-photos', false, 2097152, array\['image\/jpeg', 'image\/png', 'image\/webp'\]/)
  assert.match(sql, /review_server_only/); assert.match(sql, /review_content_locked/)
  assert.doesNotMatch(sql, /delete from|truncate|drop table|drop policy|for delete/i)
  assert.doesNotMatch(sql, /founding/)
  const cfg = read('next.config.mjs')
  assert.ok(cfg.indexOf("'/@:handle/review'") < cfg.indexOf("'/@:handle/:form'"))
  assert.ok(cfg.indexOf("'/@:handle/reviews'") < cfg.indexOf("'/@:handle/:form'"))
})

test('public routes: Turnstile, rate limit, pending by default, approved-only photos, no email', () => {
  const api = read('app/api/testimonials/submit/route.ts')
  assert.match(api, /verifyTurnstile/); assert.match(api, /rateLimit/); assert.match(api, /status: 'pending'/); assert.match(api, /sniffImage/)
  assert.doesNotMatch(api, /sendEmail|resend|stripe/i)
  const photo = read('app/api/testimonials/photo/[id]/route.ts')
  assert.match(photo, /r\.status === 'approved'/); assert.match(photo, /createSignedUrl\(r\.photo_path, 60\)/)
  assert.match(read('lib/testimonials/public.ts'), /\.eq\('status', 'approved'\)/)
  assert.match(read('app/testimonials/layout.tsx'), /hasAccess\(user, 'testimonials'\)/)
  assert.match(read('.env.example'), /^# Testimonials \(placeholder/m)
})
