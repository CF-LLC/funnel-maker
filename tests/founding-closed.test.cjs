// Founding invoices perk is closed to new signups unless explicitly re-opened.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(root, 'lib/server/access-admin.ts'), 'utf8')
test('foundingOpen defaults to closed', () => {
  assert.match(src, /INVOICES_FOUNDING_OPEN === 'true'/)
  assert.doesNotMatch(src, /INVOICES_FOUNDING_OPEN !== 'false'/)
})
test('no code path deletes or deactivates founding rows', () => {
  for (const f of ['lib/server/access-admin.ts', 'lib/server/stripe-store.ts']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8')
    assert.doesNotMatch(s, /source[^\n]*founding[^\n]*\.delete|delete\(\)[^\n]*founding/)
  }
})
