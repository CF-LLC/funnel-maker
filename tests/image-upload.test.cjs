const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const I = jiti('../lib/uploads/image.ts')
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0])
const gif = new Uint8Array([...Buffer.from('GIF89a'), 0])
const webp = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])
const svg = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))

test('sniff real image types; reject svg/html', () => {
  assert.equal(I.sniffImage(png), 'image/png'); assert.equal(I.sniffImage(jpg), 'image/jpeg')
  assert.equal(I.sniffImage(gif), 'image/gif'); assert.equal(I.sniffImage(webp), 'image/webp')
  assert.equal(I.sniffImage(svg), null); assert.equal(I.sniffImage(new Uint8Array(Buffer.from('<html>'))), null)
})
test('validateImage: type, size, magic must agree', () => {
  assert.deepEqual(I.validateImage('image/png', png), { ok: true, mime: 'image/png', ext: 'png' })
  assert.equal(I.validateImage('image/jpeg', jpg).ext, 'jpg')
  assert.equal(I.validateImage('image/svg+xml', svg).error, I.ERR.type)
  assert.equal(I.validateImage('image/png', svg).error, I.ERR.mismatch)
  assert.equal(I.validateImage('image/jpeg', png).error, I.ERR.mismatch)
  assert.equal(I.validateImage('image/png', new Uint8Array(0)).error, I.ERR.empty)
  const big = new Uint8Array(I.MAX_IMAGE_BYTES + 1); big.set(png)
  assert.equal(I.validateImage('image/png', big).error, I.ERR.size)
})
test('checkFileMeta (client)', () => {
  assert.equal(I.checkFileMeta({ type: 'image/webp', size: 10 }), null)
  assert.equal(I.checkFileMeta({ type: 'application/pdf', size: 10 }), I.ERR.type)
  assert.equal(I.MAX_IMAGE_BYTES, 3 * 1024 * 1024)
})
test('paths: per-user and only own uploads deletable', () => {
  const uid = '11111111-1111-1111-1111-111111111111', id = '22222222-2222-2222-2222-222222222222'
  assert.equal(I.objectPath(uid, id, 'png'), `${uid}/${id}.png`)
  const base = 'https://x.supabase.co'
  const url = `${base}/storage/v1/object/public/user-images/${uid}/${id}.png`
  assert.equal(I.ownedObjectPath(url, uid, base), `${uid}/${id}.png`)
  assert.equal(I.ownedObjectPath(url, '33333333-3333-3333-3333-333333333333', base), null)
  assert.equal(I.ownedObjectPath('https://evil.com/a.png', uid, base), null)
  assert.equal(I.ownedObjectPath(`${base}/storage/v1/object/public/user-images/${uid}/../x.png`, uid, base), null)
})

test('upload route checks auth before parsing the form body', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../app/api/uploads/image/route.ts'), 'utf8')
  const post = src.slice(src.indexOf('export async function POST'))
  assert.ok(post.indexOf('signedIn()') > -1 && post.indexOf('signedIn()') < post.indexOf('formData()'))
})
