// Expired/invalid email confirmation links must surface a message + resend path, not a silent redirect.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { confirmLinkErrorMessage } = jiti('../lib/auth-link-errors.ts')

test('no error params -> null', () => assert.equal(confirmLinkErrorMessage(null, null), null))
test('otp_expired -> resend guidance', () => assert.match(confirmLinkErrorMessage('otp_expired', 'Email link is invalid or has expired'), /Resend confirmation email/))
test('other error -> generic resend guidance', () => assert.match(confirmLinkErrorMessage('access_denied', 'x'), /resend/))
test('callback forwards link errors to login and checks code exchange', () => {
  const s = fs.readFileSync(path.join(root, 'app/auth/callback/route.ts'), 'utf8')
  assert.match(s, /error_code/)
  assert.match(s, /\{ data, error \} = await supabase\.auth\.exchangeCodeForSession/)
})
test('login offers resend for unconfirmed email', () => {
  const s = fs.readFileSync(path.join(root, 'app/auth/login/page.tsx'), 'utf8')
  assert.match(s, /auth\.resend\(/)
  assert.match(s, /type: 'signup'/)
})
