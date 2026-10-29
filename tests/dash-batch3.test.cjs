const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const ts = require('typescript')
const src = fs.readFileSync('lib/admin/batch3.ts', 'utf8')
const m = { exports: {} }
new Function('module', 'exports', 'process', ts.transpileModule(src, { compilerOptions: { module: 'commonjs', target: 'es2020' } }).outputText)(m, m.exports, { env: {} })
const b = m.exports
const read = (p) => fs.readFileSync(p, 'utf8')

test('csv escapes quotes, commas and formula injection', () => {
  assert.strictEqual(b.toCsv(['a', 'b'], [['x,y', '=SUM(A1)'], ['he said "hi"', null]]), 'a,b\r\nx"y"\r\n'.replace('x"y"', '"x,y",\'=SUM(A1)') + '"he said ""hi""",\r\n')
})
test('export kinds whitelist', () => {
  assert.ok(b.isExportKind('audit')); assert.ok(!b.isExportKind('users; drop'))
})
test('at-risk: idle paying users and never-signed-in, skips free and demo', () => {
  const now = Date.parse('2026-10-28T00:00:00Z')
  const r = b.atRiskUsers([
    { id: '1', email: 'idle', createdAt: '2026-01-01', lastSignInAt: '2026-09-01', tools: ['all'] },
    { id: '2', email: 'fresh', createdAt: '2026-01-01', lastSignInAt: '2026-10-27', tools: ['all'] },
    { id: '3', email: 'never', createdAt: '2026-10-01', lastSignInAt: null, tools: ['crm'] },
    { id: '4', email: 'free', createdAt: '2026-01-01', lastSignInAt: '2026-01-02', tools: [] },
    { id: '5', email: 'demo', createdAt: '2026-01-01', lastSignInAt: null, tools: ['all'], demo: true },
  ], 21, now)
  assert.deepStrictEqual(r.map((u) => u.id).sort(), ['1', '3'])
})
test('health status + alerts', () => {
  assert.strictEqual(b.healthStatus({ total: 3, last30: 0, errors7: 0 }), 'quiet')
  assert.strictEqual(b.healthStatus({ total: 3, last30: 2, errors7: 6 }), 'errors')
  assert.strictEqual(b.healthStatus({ total: null, last30: null, errors7: 0 }), 'unknown')
  assert.strictEqual(b.errorsForTool('crm', ['/api/crm/x', '/api/forms']), 1)
  const a = b.computeAlerts({ errors24h: 12, signups7: 1, signupsPrev7: 6, atRisk: 0, quietTools: [] })
  assert.deepStrictEqual(a.map((x) => x.key), ['errors', 'signups'])
})
test('alerts built disabled: off by default, no sender anywhere', () => {
  assert.strictEqual(b.ALERTS_ENABLED, false)
  for (const p of ['lib/admin/batch3.ts', 'lib/admin/load3.ts', 'components/admin/batch3-views.tsx', 'app/admin/health/page.tsx'])
    assert.ok(!/resend|sendEmail|nodemailer|fetch\(/i.test(read(p)), p)
})
test('view-as-user is audited per view, read-only, admin-guarded', () => {
  const p = read('app/admin/users/[userId]/view/page.tsx')
  assert.match(p, /requireAdminPage/); assert.match(p, /audit\(adminId, 'view_as_user'/)
  const v = read('components/admin/batch3-views.tsx').split('export function UserReadOnlyView')[1]
  assert.ok(!/<form|<button|fetch\(|onClick|Toggle/.test(v))
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(read('lib/admin/load3.ts')))
})
test('exports and list management are admin-only, audited, never delete', () => {
  const e = read('app/api/admin/export/route.ts'); assert.match(e, /adminApiGuard/); assert.match(e, /'export\.csv'/)
  const u = read('app/api/admin/updates-list/route.ts'); assert.match(u, /adminApiGuard/); assert.match(u, /audit\(/); assert.ok(!/\.delete\(/.test(u))
})
