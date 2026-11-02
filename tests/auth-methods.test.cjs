// Batch 2 (3): Google OAuth button (flag, default off), email link + 6-digit code sign-in, signup tracking per path.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('google flag defaults off', () => {
  delete process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED
  assert.equal(jiti('../lib/auth-methods.ts').googleLoginEnabled, false)
})
test('normalizeOtpCode', () => {
  const { normalizeOtpCode } = jiti('../lib/auth-methods.ts')
  assert.equal(normalizeOtpCode('123 456'), '123456')
  assert.equal(normalizeOtpCode('12345'), null)
  assert.equal(normalizeOtpCode('abcdef'), null)
  assert.equal(normalizeOtpCode(''), null)
})
test('isNewUser window', () => {
  const { isNewUser } = jiti('../lib/auth-methods.ts')
  const now = Date.parse('2026-11-01T20:00:00Z')
  assert.equal(isNewUser({ created_at: '2026-11-01T19:55:00Z' }, now, 15), true)
  assert.equal(isNewUser({ created_at: '2026-11-01T19:00:00Z' }, now, 15), false)
  assert.equal(isNewUser(null, now), false)
})
test('otpErrorMessage: expired -> send a new code; rate limit; null', () => {
  const { otpErrorMessage } = jiti('../lib/auth-methods.ts')
  assert.match(otpErrorMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' }), /Send a new code/)
  assert.match(otpErrorMessage({ message: 'email rate limit exceeded' }), /wait a few minutes/)
  assert.equal(otpErrorMessage(null), null)
})
test('google button: flag-gated, OAuth to /auth/callback with m=oauth', () => {
  const s = read('components/auth/google-button.tsx')
  assert.match(s, /if \(!googleLoginEnabled\) return null/)
  assert.match(s, /signInWithOAuth\(\{\s*provider: 'google'/)
  assert.match(s, /authCallbackUrl\(\{ m: 'oauth' \}\)/)
})
test('email code: signInWithOtp (shouldCreateUser only for signup) + verifyOtp type email + ensure-profile + turnstile', () => {
  const s = read('components/auth/email-code-signin.tsx')
  assert.match(s, /signInWithOtp\(/)
  assert.match(s, /shouldCreateUser: mode === 'signup'/)
  assert.match(s, /verifyOtp\(\{ email, token, type: 'email' \}\)/)
  assert.match(s, /\/api\/auth\/ensure-profile/)
  assert.match(s, /captchaToken/)
  assert.match(s, /trackEvent\('signup_started'/)
  assert.match(s, /trackEvent\('signup_completed'/)
})
test('login + register render both new options', () => {
  for (const f of ['app/auth/login/page.tsx', 'app/auth/register/page.tsx']) {
    const s = read(f)
    assert.match(s, /<GoogleButton mode=/)
    assert.match(s, /<EmailCodeSignIn mode=/)
  }
  assert.match(read('app/auth/login/page.tsx'), /<EmailCodeSignIn mode="login"/)
  assert.match(read('app/auth/register/page.tsx'), /<EmailCodeSignIn mode="signup"/)
})
test('callback: ensure-profile for every path + server signup_completed for oauth/otp_signup only', () => {
  const s = read('app/auth/callback/route.ts')
  assert.match(s, /ensureProfile\(serviceClient\(\), data\.user\)/)
  assert.match(s, /method === 'oauth' \|\| method === 'otp_signup'/)
  assert.match(s, /recordSiteEvent\(\{ event: 'signup_completed'/)
})
test('NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED wired in Dockerfile, compose, .env.example (default empty)', () => {
  const v = 'NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED'
  assert.match(read('Dockerfile'), new RegExp(`^ARG ${v}$`, 'm'))
  assert.match(read('Dockerfile'), new RegExp(`${v}=\\$\\{${v}\\}`))
  assert.match(read('docker-compose.yml'), new RegExp(`${v}: \\$\\{${v}:-\\}`))
  assert.match(read('.env.example'), new RegExp(`^${v}=$`, 'm'))
})
