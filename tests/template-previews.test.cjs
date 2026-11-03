const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { templates } = jiti('../data/templates.ts')
const P = jiti('../data/template-previews.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

// Width/height from a lossy (VP8) or lossless (VP8L) WebP header.
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 8, 12), 'WEBP')
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
  throw new Error('unknown webp ' + kind)
}

test('every template has a 1x and 2x WebP preview, 16:10, within budget', () => {
  assert.equal(P.PREVIEW_WIDTH * 10, P.PREVIEW_HEIGHT * 16)
  for (const t of templates) {
    const p = P.templatePreview(t.id)
    for (const [w, budget] of [[640, 40_000], [1280, 80_000]]) {
      const f = path.join(root, 'public', `/templates/previews/${t.id}-${w}.webp`)
      assert.ok(fs.existsSync(f), `missing ${f}`)
      const buf = fs.readFileSync(f)
      assert.ok(buf.length < budget, `${t.id}-${w} is ${buf.length} bytes`)
      assert.deepEqual(webpSize(buf), { w, h: (w * 10) / 16 })
      assert.ok(p.srcSet.includes(`${t.id}-${w}.webp ${w}w`))
    }
    assert.ok(fs.existsSync(path.join(root, 'public', p.src)))
  }
})

test('alt text is descriptive and names the template', () => {
  for (const t of templates) {
    const alt = P.templatePreviewAlt[t.id]
    assert.ok(alt && alt.startsWith(`${t.name} template preview: `) && alt.length > 40, t.id)
  }
  assert.equal(Object.keys(P.templatePreviewAlt).length, templates.length)
})

test('picker card uses the image with fixed size, lazy below the first row', () => {
  const src = read('components/templates/template-picker.tsx')
  assert.match(src, /width=\{p\.width\} height=\{p\.height\} alt=\{p\.alt\}/)
  assert.match(src, /loading=\{eager \? 'eager' : 'lazy'\}/)
  assert.match(src, /eager=\{i < 3\}/)
  assert.match(src, /aspect-\[16\/10\]/)
})

test('renderer root text colour beats the noir island rule', () => {
  const css = read('app/globals.css')
  assert.match(css, /\.noir \.fm-theme\.text-white \{ color: #fff; \}/)
  assert.match(css, /\.noir \.fm-theme\.text-gray-900 \{ color: #111827; \}/)
})

test('glass template text stays white on its gradient cards', () => {
  const css = read('app/globals.css')
  assert.match(css, /\.fm-theme\.fm-theme-glass\.text-gray-900 \{ color: #fff; \}/)
  assert.ok(css.indexOf('.fm-theme.fm-theme-glass.text-gray-900') > css.indexOf('.noir .fm-theme.text-gray-900'))
})
