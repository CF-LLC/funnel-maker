// PR 2 (SaaS Nation rework): email-based client picker in Invoices/Proposals (workspace_v2) + "Clients" rename.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const P = jiti('../lib/clients/picker-core.ts')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('picker options: normalized email, invalid dropped, deduped, sorted by name', () => {
  const o = P.toPickerOptions([
    { email: ' Maya@Example.com ', name: 'Maya Lopez', company: 'Riverside' },
    { email: 'maya@example.com', name: 'Dup' },
    { email: 'not an email', name: 'Ghost' },
    { email: 'ann@x.co', name: '  Ann ' },
    { email: 'zed@x.co' },
  ])
  assert.deepEqual(o.map((x) => x.email), ['ann@x.co', 'maya@example.com', 'zed@x.co'])
  assert.equal(o[0].name, 'Ann'); assert.equal(o[1].company, 'Riverside')
})

test('picker search: name, email, company; case-insensitive; limit', () => {
  const o = P.toPickerOptions([{ email: 'maya@example.com', name: 'Maya', company: 'Riverside' }, { email: 'sam@n.co', name: 'Sam' }])
  assert.deepEqual(P.filterPicker(o, 'RIVER').map((x) => x.email), ['maya@example.com'])
  assert.deepEqual(P.filterPicker(o, 'sam@').map((x) => x.email), ['sam@n.co'])
  assert.equal(P.filterPicker(o, '').length, 2)
  assert.equal(P.filterPicker(o, '', 1).length, 1)
  assert.equal(P.filterPicker(o, 'nobody').length, 0)
})

test('saved-client match is by normalized email only, never by name', () => {
  const saved = [{ id: 'a', name: 'Maya', email: 'MAYA@example.com ' }, { id: 'b', name: 'Sam', email: null }]
  assert.equal(P.matchSaved(saved, 'maya@example.com').id, 'a')
  assert.equal(P.matchSaved(saved, 'Sam'), null)
  assert.equal(P.matchSaved(saved, 'other@x.co'), null)
})

test('loader: flag-gated, read-only, no writes or inv_clients copy', () => {
  const s = read('lib/clients/picker.ts')
  assert.match(s, /isUserFlagEnabled\('workspace_v2'/)
  assert.match(s, /loadContacts\(/)
  assert.doesNotMatch(s, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|inv_clients/)
})

test('editors: picker only when crmClients given (flag off = unchanged); manual fields kept', () => {
  for (const f of ['components/invoices/invoice-editor.tsx', 'components/proposals/proposal-editor.tsx']) {
    const s = read(f)
    assert.match(s, /\{crmClients &&[^}]*<ClientPicker/)
    assert.doesNotMatch(read('components/clients/client-picker.tsx'), /supabase|fetch\(/)
  }
  assert.match(read('components/invoices/invoice-editor.tsx'), /inp\('clientName', 'Name'\)\}\{inp\('clientEmail'/)
  assert.match(read('components/proposals/proposal-editor.tsx'), /aria-label="New client email"/)
  for (const f of ['app/invoices/new/page.tsx', 'app/invoices/[id]/page.tsx', 'app/proposals/new/page.tsx', 'app/proposals/[id]/page.tsx']) assert.match(read(f), /crmClients=\{await loadPickerClients\(\)\}/)
})

test('"Clients" rename: tool, nav, pricing, /crm headings; URL unchanged', () => {
  const t = read('tools/crm/tool.ts')
  assert.match(t, /name: 'Clients'/); assert.match(t, /label: 'Clients', href: '\/crm'/)
  assert.match(read('components/pricing-plans.tsx'), /\{ id: 'crm', name: 'Clients' \}/)
  assert.match(read('app/crm/layout.tsx'), /title: 'Clients · SaaS Nation'/)
  for (const f of ['tools/crm/tool.ts', 'components/pricing-plans.tsx', 'app/crm/layout.tsx', 'app/pricing/page.tsx', 'components/crm/contact-list.tsx']) assert.doesNotMatch(read(f), /Client list/)
})
