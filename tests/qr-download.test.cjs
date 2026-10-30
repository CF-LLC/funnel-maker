const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const d = jiti('../lib/free-tools/qr-download.ts')
const { bookPath } = jiti('../lib/booking/core.ts')
const { publicPath } = jiti('../lib/linkinbio/core.ts')

test('qr download: absolute urls and safe file names', () => {
  assert.equal(d.absoluteUrl('/@me', 'https://saasnation.site/'), 'https://saasnation.site/@me')
  assert.equal(d.absoluteUrl(bookPath('me', 'call'), 'https://x.io'), 'https://x.io/@me/book/call')
  assert.equal(d.qrFileStem(bookPath('Me', 'strategy-call')), 'qr-me-book-strategy-call')
  assert.equal(d.qrFileStem('/'), 'qr-link')
})

test('qr download: svg and matrix reuse the free QR library', () => {
  const svg = d.qrSvgFor('https://saasnation.site' + publicPath('me'))
  assert.match(svg, /^<svg[^>]+viewBox="0 0 \d+ \d+"/)
  assert.ok(d.qrMatrixFor('https://saasnation.site/@me').size >= 21)
  assert.equal(d.QR_STYLE.fg, '#111111'); assert.equal(d.QR_STYLE.bg, '#ffffff')
})

test('qr download: wired into Link-in-bio and Booking owner pages, not a new tool', () => {
  const r = (f) => fs.readFileSync(path.join(root, f), 'utf8')
  assert.match(r('components/linkinbio/editor.tsx'), /<DownloadQr path=\{publicPath\(p\.handle\)\}/)
  assert.match(r('app/booking/page.tsx'), /<DownloadQr path=\{bookPath\(handle\)\}/)
  assert.match(r('components/booking/dashboard.tsx'), /<DownloadQr path=\{bookPath\(handle, t\.slug\)\}/)
  assert.match(r('components/qr/download-qr.tsx'), /from '@\/lib\/free-tools\/qr'/)
  assert.ok(!fs.existsSync(path.join(root, 'tools', 'qr')))
})

test('qr download: PNG pixels decode back to the booking url', () => {
  const jsQR = require('jsqr')
  const { matrixToRgba } = jiti('../lib/free-tools/qr.ts')
  const url = d.absoluteUrl(bookPath('me', 'call'), 'https://saasnation.site')
  const img = matrixToRgba(d.qrMatrixFor(url), { ...d.QR_STYLE, px: 300 })
  assert.equal(jsQR(img.data, img.width, img.height)?.data, url)
})
