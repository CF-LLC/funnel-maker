const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('mobile menu is accessible and links to real routes', () => {
  const nav = read('components/nav/navbar.tsx')
  for (const s of ['aria-expanded', 'aria-label={open', "e.key === 'Escape'", "document.body.style.overflow = 'hidden'", 'min-h-[56px]', '[pathname]']) assert.ok(nav.includes(s), s)
  for (const r of ['app/free-tools/page.tsx', 'app/pricing/page.tsx', 'app/guides/page.tsx', 'app/auth/login/page.tsx']) assert.ok(fs.existsSync(path.join(root, r)), r)
})

test('bottom bar is phone-only, safe-area aware and pads the page', () => {
  const nav = read('components/nav/navbar.tsx'); const css = read('app/globals.css')
  assert.match(nav, /mobile-bottom-bar fixed[^"]*md:hidden/)
  assert.match(nav, /safe-area-inset-bottom/)
  assert.match(css, /body\.has-mobile-bar \{ padding-bottom/)
})

test('bar only on marketing pages: app/auth/public pages do not use the marketing Navbar', () => {
  const users = []
  const walk = (d) => { for (const f of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx$/.test(f.name) && read(p).includes("from '@/components/nav/navbar'")) users.push(p) } }
  walk('app'); walk('components')
  for (const u of users) assert.ok(!/^app\/(dashboard|admin|auth|f|u|book|booking|p|s|c|d|i|r|portal)\//.test(u), u)
})

test('software as a service is spelled out in home/pricing meta and footer', () => {
  const jiti = require('jiti')(__filename, { alias: { '@': root } })
  const og = jiti('../lib/og/pages.ts')
  for (const s of [og.HOME_TITLE, og.HOME_DESCRIPTION, og.PRICING_TITLE, og.PRICING_DESCRIPTION, og.FREE_TOOLS_DESCRIPTION]) assert.match(s, /software as a service/i)
  assert.match(read('components/nav/footer.tsx'), /software as a service/i)
})
