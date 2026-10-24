const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const F = jiti('../lib/forms/core.ts')
const reg = jiti('../tools/registry.ts')
const fields = [
  { id: 'name', type: 'short_text', label: 'Name', required: true },
  { id: 'email', type: 'email', label: 'Email', required: true },
  { id: 'phone', type: 'phone', label: 'Phone', required: false },
  { id: 'plan', type: 'dropdown', label: 'Plan', required: true, options: ['A', 'B'] },
  { id: 'ok', type: 'checkbox', label: 'Agree', required: true },
  { id: 'd', type: 'date', label: 'Date', required: false },
  { id: 'msg', type: 'long_text', label: 'Msg', required: false },
]

test('forms tool registered at /forms, sold tool', () => {
  assert.equal(reg.getTool('forms').route, '/forms'); assert.ok(reg.SOLD_ACCESS_KEYS.includes('forms'))
  assert.ok(reg.isProtectedPath('/forms/x')); assert.ok(!reg.isProtectedPath('/u/h/f/x'))
})
test('form schema: 7 types, max 10 fields, dropdown needs options, unique ids', () => {
  assert.deepEqual([...F.FIELD_TYPES], ['short_text', 'long_text', 'email', 'phone', 'dropdown', 'checkbox', 'date'])
  const base = { slug: 'Contact', title: 'T', description: '', submit_label: 'Send', published: true }
  assert.equal(F.formSchema.parse({ ...base, fields }).slug, 'contact')
  const many = Array.from({ length: 11 }, (_, i) => ({ id: 'f' + i, type: 'short_text', label: 'x', required: false }))
  assert.equal(F.formSchema.safeParse({ ...base, fields: many }).success, false)
  assert.equal(F.formSchema.safeParse({ ...base, fields: [{ id: 'a', type: 'dropdown', label: 'x', required: false }] }).success, false)
  assert.equal(F.formSchema.safeParse({ ...base, fields: [fields[0], fields[0]] }).success, false)
  assert.equal(F.formSchema.safeParse({ ...base, fields: [{ id: 'a', type: 'file', label: 'x', required: false }] }).success, false)
})
test('submission validation', () => {
  const good = { name: 'Al', email: 'a@b.co', phone: '+1 555 0100', plan: 'A', ok: true, d: '2026-10-24', msg: '', extra: 'dropped' }
  const r = F.validateSubmission(fields, good); assert.ok(r.ok); assert.equal(r.values.extra, undefined); assert.equal(r.values.ok, true)
  assert.equal(F.validateSubmission(fields, { ...good, email: 'nope' }).ok, false)
  assert.equal(F.validateSubmission(fields, { ...good, plan: 'C' }).ok, false)
  assert.equal(F.validateSubmission(fields, { ...good, ok: false }).ok, false)
  assert.equal(F.validateSubmission(fields, { ...good, name: '' }).ok, false)
  assert.equal(F.validateSubmission(fields, { ...good, d: '2026-99-99' }).ok, false)
})
test('CSV export guards formulas and quotes; mailto goes to the user', () => {
  const csv = F.toCsv(fields.slice(0, 2), [{ created_at: '2026-10-24T00:00:00Z', data: { name: '=HYPERLINK("x")', email: 'a@b.co' } }])
  assert.match(csv, /^Submitted at,Name,Email\r\n/); assert.match(csv, /"'=HYPERLINK\(""x""\)"/)
  const m = F.responseMailto('me@x.co', 'Contact', fields.slice(0, 1), { created_at: 't', data: { name: 'Al' } })
  assert.ok(m.startsWith('mailto:me%40x.co?subject=')); assert.match(decodeURIComponent(m), /Name: Al/)
})
test('public path, embed src, rewrite, route guards', () => {
  assert.equal(F.publicFormPath('coop', 'contact'), '/@coop/contact')
  assert.equal(F.formEmbedSrc('/@Coop/contact'), '/u/coop/f/contact?embed=1')
  assert.equal(F.formEmbedSrc('https://saasnation.site/@coop/contact'), '/u/coop/f/contact?embed=1')
  assert.equal(F.formEmbedSrc('https://evil.com/@coop/contact'), undefined)
  assert.equal(F.formEmbedSrc('javascript:alert(1)'), undefined)
  assert.match(fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8'), /source: '\/@:handle\/:form', destination: '\/u\/:handle\/f\/:form'/)
  const sub = fs.readFileSync(path.join(root, 'app/api/forms/submit/route.ts'), 'utf8')
  assert.match(sub, /verifyTurnstile/); assert.match(sub, /rateLimit\(`form:\$\{ip\}`/); assert.match(sub, /validateSubmission/)
  assert.doesNotMatch(sub, /sendEmail|resend/i)
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261024_forms.sql'), 'utf8')
  assert.match(sql, /'funnels', 'invoices', 'linkinbio', 'forms', 'all'/); assert.match(sql, /jsonb_array_length\(fields\) <= 10/)
  assert.doesNotMatch(sql, /delete from|truncate|drop table/i)
})
