# Sign-in options: Google + email link / code (Batch 2, item 3)

Code ships **safe by default**: the Google button is hidden until `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true`; the
email link/code option works with the current Supabase settings (email provider is on), but the *code* only
appears in emails once the templates below include `{{ .Token }}`.

## What the code does
- **Continue with Google** (login + register): `supabase.auth.signInWithOAuth({ provider: 'google' })`,
  returns to `https://saasnation.site/auth/callback?m=oauth`, which exchanges the code, runs `ensureProfile`
  and records `signup_completed` server-side for accounts created in the last 15 minutes.
- **Email me a sign-in link or code** (login, `shouldCreateUser: false`) / **Sign up with an email code**
  (register, `shouldCreateUser: true`, keeps template + wish-tool metadata): `signInWithOtp`. The user can click
  the link (lands on `/auth/callback?m=otp|otp_signup`) **or** type the code (`verifyOtp({ type: 'email' })`),
  which works on any device/browser. Expired/used code -> clear message + "Send a new code". Turnstile token is
  sent when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set (widget remounts after each send; tokens are single-use).
- Tracking: `signup_started` on each signup path (password / google / email_code); `signup_completed` on the
  register page (password), after a code verify for a new user (email_code), or in `/auth/callback` (google,
  email-code link). Profiles: `ensureProfile` runs in the callback and via `/api/auth/ensure-profile` after a code verify.

## What Cooper / ops must configure (outside code) — NOT done, needs Cooper
What I could read (public `GET /auth/v1/settings`, 2026-11-01): email provider **on**, Google **off**,
email confirmations **required** (`mailer_autoconfirm: false`), signups open. The full Auth config (OTP
expiry, templates, redirect allow-list, SMTP) is **not readable**: the Management API returns 401 with the
token on the box and the Supabase MCP has no auth-config tool. Nothing was changed.

1. **Google provider** (Supabase Dashboard -> Authentication -> Sign In / Providers -> Google): needs a Google
   Cloud OAuth 2.0 Client (Web) id + secret, which Cooper must create/approve. In Google Cloud set
   Authorized redirect URI `https://nosvgroktxgesolphhyn.supabase.co/auth/v1/callback` and the OAuth consent
   screen (app name SaaS Nation, domain saasnation.site). Then set build arg
   `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true` and redeploy. Don't flip the flag before the provider is on.
2. **Email OTP expiry** (Authentication -> Providers -> Email -> "Email OTP Expiration"): raise from the
   1 hour default to e.g. 86400 s (24 h, the maximum). This governs confirmation links, magic links and codes.
3. **Email templates** (Authentication -> Emails -> Templates): add the code to **Magic Link** *and*
   **Confirm signup** (new users from the code signup get the confirm template), e.g.
   `<p>Your SaaS Nation code: <strong>{{ .Token }}</strong></p>` next to the existing `{{ .ConfirmationURL }}` link.
4. **Redirect URL allow-list** (Authentication -> URL Configuration): Site URL `https://saasnation.site`;
   Redirect URLs `https://saasnation.site/auth/callback` and `https://saasnation.site/auth/callback?**`
   (query `m=oauth|otp|otp_signup`, `next=`). Optional: `https://funnels.saasnation.site/auth/callback?**`.
5. Optional: custom SMTP (Supabase's built-in mailer is rate-limited to a few emails/hour) - sending path
   must be one Cooper approves.

Verified 2026-11-01 with an admin-created temp user (no email sent, cleaned up): this project issues **8-digit** codes; right code -> session + email confirmed; wrong or reused code -> `otp_expired` (clear "Send a new code" message); login for an unknown email -> `otp_disabled` (no email sent).

Note: links use PKCE, so a *link* opened in a different browser than the one that requested it fails; the
code box is the fallback for that and for expired links.
