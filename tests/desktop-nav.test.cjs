const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const nav = fs.readFileSync(path.join(__dirname, '..', 'components/nav/navbar.tsx'), 'utf8')

test('desktop header renders the same links as the phone menu, including Guides', () => {
  assert.match(nav, /data-desktop-nav-links>\s*\{MOBILE_MENU_LINKS\.map/)
  assert.ok(nav.includes("{ href: '/guides', label: 'Guides' }"))
})

test('desktop actions say Sign in and never nest a button inside a link', () => {
  assert.ok(nav.includes('<Link href="/auth/login">Sign in</Link>'))
  assert.ok(!/>Login</.test(nav), 'no "Login" label')
  assert.ok(!/<Link[^>]*><Button/.test(nav), 'no <Link><Button> (double tab stop)')
})

test('logo keeps the Software as a Service subtitle and desktop links have a focus ring', () => {
  assert.ok(nav.includes('data-logo-subtitle>Software as a Service'))
  assert.match(nav, /const desk = '[^']*focus-visible:ring-2[^']*whitespace-nowrap|const desk = 'whitespace-nowrap[^']*focus-visible:ring-2/)
})
