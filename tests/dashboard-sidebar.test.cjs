const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const src = fs.readFileSync(path.join(__dirname, '..', 'app/dashboard/layout.tsx'), 'utf8')

test('dashboard sidebar nav scrolls instead of clipping items past the screen bottom', () => {
  assert.match(src, /<nav className="min-h-0 flex-1[^"]*overflow-y-auto[^"]*" aria-label="Dashboard"/)
  assert.match(src, /flex h-full min-h-0 flex-col/)
  assert.match(src, /shrink-0 border-t p-3/, 'sign-out footer stays pinned')
  assert.match(src, /h-\[100dvh\] w-72/, 'phone drawer sized to the visible viewport')
})
