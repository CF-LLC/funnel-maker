const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/portal/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const U = '4ae5bb76-7500-44cc-a768-b7af49606684', P = 'f598cbaf-1111-4222-8333-444444444444'

test('tokens are 64 hex; anything else is rejected', () => {
  assert.ok(C.isToken('a'.repeat(64)))
  assert.ok(!C.isToken('a'.repeat(63)) && !C.isToken('demo') && !C.isToken('A'.repeat(64)) && !C.isToken(null))
  assert.equal(C.portalUrl('ab'), `${C.SITE}/p/ab`)
  assert.match(read('app/api/portal/portals/[id]/regenerate/route.ts'), /randomBytes\(32\)\.toString\('hex'\)/)
})

test('checklist steps: title required, https links only, who defaults to client', () => {
  assert.equal(C.cleanTask({ title: '' }).ok, false)
  assert.equal(C.cleanTask({ title: 'x', link: 'http://a.com' }).ok, false)
  assert.equal(C.cleanTask({ title: 'x', link: 'javascript:alert(1)' }).ok, false)
  const t = C.cleanTask({ title: ' Pay ', link: 'https://a.com/x', who: 'zzz' })
  assert.deepEqual(t, { ok: true, task: { title: 'Pay', note: null, link: 'https://a.com/x', who: 'client' } })
  assert.equal(C.cleanItems(Array(31).fill({ title: 'a' })), null)
  assert.deepEqual(C.progress([{ done_at: 'x' }, { done_at: null }, { done_at: null }, { done_at: 'y' }]), { done: 2, total: 4, pct: 50 })
  assert.deepEqual(C.progress([]), { done: 0, total: 0, pct: 0 })
})

test('files: type, 25 MB and 500 MB caps; owner folder paths only', () => {
  assert.equal(C.checkFile('a.pdf', 10).ok, true)
  assert.equal(C.checkFile('a.exe', 10).ok, false)
  assert.equal(C.checkFile('a.pdf', 26 * 1024 * 1024).ok, false)
  assert.equal(C.checkFile('a.pdf', 10, C.MAX_STORAGE_BYTES).ok, false)
  const p = C.objectPath(U, P, '../My File!!.PDF', 'abcd1234')
  assert.ok(C.pathOwned(p, U, P)); assert.ok(!p.includes('..'))
  assert.ok(!C.pathOwned(`${U}/${P}/../x`, U, P)); assert.ok(!C.pathOwned(`${P}/${U}/x.pdf`, U, P))
})

test('never sends email: invite is mailto only, no Resend/sendEmail anywhere in the portal', () => {
  assert.equal(C.PORTAL_SENDS_EMAIL, false)
  assert.match(C.mailtoHref('Maya Chen', 'maya@example.com', 'https://x/p/1'), /^mailto:maya%40example\.com\?subject=/)
  const files = ['lib/portal', 'app/api/portal', 'app/portal', 'app/p', 'components/portal'].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(d, f)))
  assert.ok(files.length > 10)
  for (const f of files) assert.doesNotMatch(read(f), /resend|sendEmail|sendMail|nodemailer/i, f)
})

test('public portal: noindex, rate limited, revoked + access checked, client can only tick client steps, short signed downloads', () => {
  assert.match(read('app/p/[token]/page.tsx'), /index: false/)
  assert.match(read('app/p/[token]/page.tsx'), /rateLimit\(/)
  assert.match(read('app/api/portal/public/tick/route.ts'), /rateLimit\(/)
  assert.match(read('app/api/portal/public/file/route.ts'), /rateLimit\(/)
  const pub = read('lib/portal/public.ts')
  assert.match(pub, /p\.revoked/); assert.match(pub, /pt_has_access/)
  assert.match(pub, /\.eq\('who', 'client'\)/)
  assert.match(pub, /createSignedUrl\(f\.path, SIGNED_TTL_SECONDS/); assert.equal(C.SIGNED_TTL_SECONDS, 60)
  assert.match(read('lib/portal/items.ts'), /publicOnly && i\.status === 'draft'/)
})

test('migration is additive with tight RLS/grants and flag shipped off', () => {
  const sql = read('supabase/migrations/20261029a_portal.sql')
  assert.doesNotMatch(sql, /drop table|drop column|delete from|truncate/i)
  for (const t of ['pt_templates', 'pt_portals', 'pt_shares', 'pt_tasks', 'pt_files']) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
  assert.match(sql, /revoke all on .*from anon/i)
  assert.match(sql, /grant update \(client_name, client_email, welcome, revoked, token, updated_at\) on public\.pt_portals/)
  assert.match(sql, /'pt-files', 'pt-files', false/)
  assert.match(sql, /portal_public', false/)
})

test('owner APIs use the session guard (RLS), writes block demo', () => {
  for (const f of ['portals/route.ts', 'portals/[id]/route.ts', 'portals/[id]/regenerate/route.ts', 'shares/route.ts', 'tasks/route.ts', 'files/route.ts', 'templates/route.ts'])
    assert.match(read(`app/api/portal/${f}`), /ptGuard\(true\)/, f)
  assert.doesNotMatch(read('lib/portal/guard.ts'), /serviceClient/)
})
