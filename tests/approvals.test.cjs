const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/approvals/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const U = '4ae5bb76-7500-44cc-a768-b7af49606684', I = '00000000-0000-4000-8000-000000000001'

test('tokens are 64 hex; regenerate uses 32 random bytes; url is /a/', () => {
  assert.ok(C.isToken('a'.repeat(64)) && !C.isToken('demo') && !C.isToken('A'.repeat(64)) && !C.isToken(null))
  assert.equal(C.approvalUrl('ab'), `${C.SITE}/a/ab`)
  assert.match(read('app/api/approvals/items/[id]/regenerate/route.ts'), /randomBytes\(32\)\.toString\('hex'\)/)
})

test('validation: items, comments, decisions (changes need a note)', () => {
  assert.equal(C.cleanItem({ title: '', client_name: 'x' }).ok, false)
  assert.equal(C.cleanItem({ title: 'x', client_name: 'y', client_email: 'bad' }).ok, false)
  assert.deepEqual(C.cleanItem({ title: ' Logo ', client_name: 'Maya', client_email: 'M@X.co' }), { ok: true, i: { title: 'Logo', client_name: 'Maya', client_email: 'm@x.co' } })
  assert.equal(C.cleanComment({ body: '  ' }).ok, false)
  assert.equal(C.cleanComment({ body: 'x'.repeat(5000) }).body.length, 2000)
  assert.equal(C.cleanDecision({ decision: 'approved', name: ' ' }).ok, false)
  assert.equal(C.cleanDecision({ decision: 'maybe', name: 'x' }).ok, false)
  assert.equal(C.cleanDecision({ decision: 'changes', name: 'Maya', note: '' }).ok, false)
  assert.deepEqual(C.cleanDecision({ decision: 'approved', name: 'Maya' }), { ok: true, d: { status: 'approved', name: 'Maya', note: null } })
})

test('versions: numbering v1, v2…; item status is the latest version', () => {
  assert.equal(C.nextNumber([]), 1); assert.equal(C.nextNumber([{ number: 1 }, { number: 3 }]), 4)
  assert.equal(C.vLabel(2), 'v2')
  assert.equal(C.itemStatus([]), 'empty')
  assert.equal(C.itemStatus([{ number: 1, status: 'approved' }, { number: 2, status: 'waiting' }]), 'waiting')
  assert.equal(C.itemStatus([{ number: 2, status: 'changes' }, { number: 1, status: 'waiting' }]), 'changes')
})

test('files: pdf/images only, 25 MB each, 500 MB per user, owner folder paths', () => {
  assert.equal(C.checkFile('a.pdf', 10).mime, 'application/pdf')
  assert.equal(C.checkFile('A.JPG', 10).mime, 'image/jpeg')
  for (const n of ['a.mp4', 'a.svg', 'a.html', 'pdf', '']) assert.equal(C.checkFile(n, 10).ok, false, n)
  assert.equal(C.checkFile('a.png', 0).ok, false)
  assert.equal(C.checkFile('a.png', C.MAX_FILE_BYTES + 1).ok, false)
  assert.equal(C.checkFile('a.png', 10, C.MAX_STORAGE_BYTES - 5).ok, false)
  const p = C.objectPath(U, I, '../My Poster!!.PNG', 'r1')
  assert.equal(p, `${U}/${I}/r1-my-poster-.png`); assert.ok(C.pathOwned(p, U, I))
  assert.ok(!C.pathOwned(`${U}/${I}/../x`, U, I)); assert.ok(!C.pathOwned(`other/${I}/x`, U, I)); assert.ok(!C.pathOwned(`${U}/${I}/a/b`, U, I))
  assert.ok(C.SIGNED_TTL_SECONDS <= 300)
  const v = read('app/api/approvals/versions/route.ts')
  assert.match(v, /storage\.from\(BUCKET\)\.list/); assert.match(v, /checkFile\(b\?\.name, size, usedBytes\)/); assert.match(v, /remove\(\[path\]\)/)
})

test('video: links only (https), YouTube/Vimeo/Loom embedded, others plain links', () => {
  assert.equal(C.cleanVideoUrl('http://x.com/v'), null); assert.equal(C.cleanVideoUrl('javascript:alert(1)'), null); assert.equal(C.cleanVideoUrl('https://u:p@x.com'), null)
  assert.equal(C.embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  assert.equal(C.embedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  assert.equal(C.embedUrl('https://vimeo.com/76979871'), 'https://player.vimeo.com/video/76979871')
  assert.equal(C.embedUrl('https://www.loom.com/share/abc123def456'), 'https://www.loom.com/embed/abc123def456')
  assert.equal(C.embedUrl('https://drive.google.com/file/d/x'), null)
  assert.ok(!fs.existsSync(path.join(root, 'app/api/approvals/video')))
})

test('never sends email; mailto only', () => {
  assert.equal(C.APPROVALS_SENDS_EMAIL, false)
  assert.match(C.mailtoHref('Maya Chen', 'maya@example.com', 'Logo', 'https://x/a/1'), /^mailto:maya%40example\.com\?subject=/)
  const files = ['lib/approvals', 'app/api/approvals', 'app/approvals', 'app/a', 'components/approvals'].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(d, f)))
  assert.ok(files.length > 12)
  for (const f of files) assert.doesNotMatch(read(f), /resend|sendEmail|sendMail|nodemailer/i, f)
})

test('public page + routes: noindex, rate limited, revoked + access checked, latest+waiting only, demo stores nothing', () => {
  const pg = read('app/a/[token]/page.tsx')
  assert.match(pg, /index: false/); assert.match(pg, /rateLimit\(`ap-view/); assert.match(pg, /referrer: 'no-referrer'/)
  for (const [f, k] of [['decide', 'ap-decide'], ['comment', 'ap-comment']]) {
    const rt = read(`app/api/approvals/public/${f}/route.ts`)
    assert.match(rt, new RegExp(`rateLimit\\(\`${k}`)); assert.match(rt, /X-Robots-Tag/); assert.match(rt, /DEMO_TOKEN\) return/)
  }
  const pub = read('lib/approvals/public.ts')
  assert.match(pub, /i\.revoked/); assert.match(pub, /ap_has_access/); assert.match(pub, /\.eq\('status', 'waiting'\)/); assert.match(pub, /latest\.id !== versionId/)
  assert.match(pub, /path: _p/)
  assert.match(pub, /createSignedUrl\(latest\.path, SIGNED_TTL_SECONDS\)/)
})

test('migration: additive, owner-only RLS, private bucket, owners cannot forge decisions, flag off', () => {
  const m = read('supabase/migrations/20261029c_approvals.sql')
  assert.doesNotMatch(m, /drop table|drop column|truncate|delete from/i)
  assert.match(m, /enable row level security/g)
  assert.match(m, /approvals_public', false/)
  assert.match(m, /'ap-files', 'ap-files', false/)
  assert.doesNotMatch(m, /grant [^;]*update[^;]*on public\.ap_versions/i)
  assert.doesNotMatch(m, /grant insert \([^)]*\b(status|decided_name|decided_at|author)\b[^)]*\) on public\.ap_(versions|comments)/i)
  assert.match(m, /author = 'owner'/)
})

test('owner APIs use the session guard (RLS); writes block demo', () => {
  for (const f of ['app/api/approvals/items/route.ts', 'app/api/approvals/items/[id]/route.ts', 'app/api/approvals/items/[id]/regenerate/route.ts', 'app/api/approvals/versions/route.ts', 'app/api/approvals/comments/route.ts']) {
    const s = read(f); assert.match(s, /apGuard\(true\)/, f); assert.doesNotMatch(s, /serviceClient/, f)
  }
  assert.match(read('app/api/approvals/file/route.ts'), /apGuard\(false\)/)
})
