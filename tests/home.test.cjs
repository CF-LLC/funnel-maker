const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('social proof slot renders nothing while empty (and the shipped data is empty)', () => {
  // Compile the real .tsx component (sucrase ships with the toolchain) and render it to HTML.
  const { transform } = require('sucrase')
  const code = transform(read('components/home/social-proof.tsx'), { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic', production: true }).code
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)((m) => (m.startsWith('@/') ? jiti('../' + m.slice(2) + '.ts') : require(m)), mod, mod.exports)
  const { SocialProofSlot } = mod.exports
  const { renderToStaticMarkup } = require('react-dom/server')
  const React = require('react')
  assert.equal(renderToStaticMarkup(React.createElement(SocialProofSlot)), '')
  const { SOCIAL_PROOF } = jiti('../lib/home/social-proof.ts')
  assert.deepEqual(SOCIAL_PROOF, { stats: [], quotes: [] })
  assert.equal(SocialProofSlot({}), null)
  assert.equal(SocialProofSlot({ data: { stats: [], quotes: [] } }), null)
  assert.equal(SocialProofSlot({ data: { stats: [{ value: ' ', label: '', source: '' }], quotes: [{ quote: '', name: '', permissionNote: '' }] } }), null)
  assert.match(renderToStaticMarkup(React.createElement(SocialProofSlot, { data: { stats: [{ value: '10', label: 'Real thing', source: 'db' }], quotes: [] } })), /data-social-proof/)
})

test('home price line matches the pricing constants', () => {
  const { HOME_PRICE_LINE } = jiti('../lib/home/pricing-line.ts')
  assert.equal(HOME_PRICE_LINE, 'Any tool $12/mo or $99/yr · All Access $29/mo or $249/yr')
})

test('home page: free tools strip, one main CTA, flag-aware tool list, no repeated rows', () => {
  const { FREE_TOOLS } = jiti('../lib/free-tools/registry.ts')
  assert.deepEqual(FREE_TOOLS.map((t) => t.slug), ['invoice-generator', 'hourly-rate-calculator', 'utm-builder', 'qr-code-generator', 'email-signature-generator', 'late-invoice-kit'])
  const page = read('app/page.tsx')
  assert.match(page, /alternates: \{ canonical: '\/' \}/)
  assert.match(page, /getLaunchFlags\(\)/)
  assert.match(page, /toolsInRow\(row, flags\)/)
  assert.doesNotMatch(page, /HOME_ROWS\.map/)
  assert.equal((page.match(/href: '/g) || []).length, 1, 'one main CTA in the hero')
  assert.match(read('components/home/free-tools-strip.tsx'), /FREE_TOOLS_PATH/)
  const ex = read('components/home/examples.tsx')
  assert.match(ex, /loading="lazy"/); assert.match(ex, /\.webp/); assert.match(ex, /alt=\{e\.alt\}/)
  for (const f of ['public/examples/funnel-page.webp', 'public/examples/invoice.webp']) assert.ok(fs.statSync(path.join(root, f)).size < 60_000, f)
  assert.doesNotMatch(read('components/home/why.tsx'), /hubspot|kajabi|clickfunnels|calendly|mailchimp|gumroad|stan|kartra|teachable|convertkit|kit\b/i)
})

test('tool updates signup: email + source normalizing', () => {
  const u = jiti('../lib/updates/signup.ts')
  assert.equal(u.normalizeSignupEmail('  Ana@Example.COM '), 'ana@example.com')
  for (const bad of ['', 'nope', 'a@b', 'a b@c.co', '<x>@y.co', 'a@b.c', 42, null]) assert.equal(u.normalizeSignupEmail(bad), null, String(bad))
  assert.equal(u.cleanSourcePage('/pricing?x=1#a'), '/pricing')
  assert.equal(u.cleanSourcePage('https://evil.com'), '/')
  assert.equal(u.cleanSourcePage('//evil.com'), '/')
  assert.equal(u.cleanSourcePage('/<script>'), '/script')
  assert.ok(u.UPDATES_CONSENT_TEXT.includes('Unsubscribe any time'))
  assert.ok(u.isUuid('123e4567-e89b-12d3-a456-426614174000')); assert.ok(!u.isUuid("1' or 1=1"))
})

test('tool updates signup: migration is RLS-locked and the route never sends email', () => {
  const sql = read('supabase/migrations/20261028c_tool_updates_signups.sql')
  assert.match(sql, /enable row level security/); assert.match(sql, /force row level security/)
  assert.match(sql, /revoke all on table public\.tool_updates_signups from public, anon, authenticated/)
  assert.doesNotMatch(sql, /create policy|grant [^;]*to (anon|authenticated)/i)
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i)
  assert.match(sql, /unique index[^;]*lower\(email\)/); assert.match(sql, /unsubscribed_at timestamptz/)
  const route = read('app/api/updates/subscribe/route.ts')
  assert.match(route, /b\?\.company/); assert.match(route, /rateLimit\(/); assert.match(route, /verifyTurnstile\(/); assert.match(route, /serviceClient\(\)/)
  assert.match(route, /consent_text: UPDATES_CONSENT_TEXT/); assert.match(route, /source_page/)
  const all = route + read('app/api/updates/unsubscribe/route.ts') + read('components/home/updates-signup.tsx')
  assert.doesNotMatch(all, /resend|sendEmail|sendMail|nodemailer|localStorage|sessionStorage/i)
  assert.doesNotMatch(read('components/home/updates-signup.tsx'), /serviceClient|SUPABASE_SECRET/)
})
