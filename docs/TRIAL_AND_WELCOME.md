# 7-day free trial + welcome emails (day 0/2/5)

Status (Nov 1, 2026): **investigated and scaffolded only. No Stripe object was created or changed, no email was sent, no flag or env var was set.**

## A. 7-day free trial

### Current setup (read from the repo)
- Checkout = **Stripe Payment Links** baked in at build time: `NEXT_PUBLIC_STRIPE_LINK_<TOOL>_{MONTHLY,YEARLY}` for each tool in `lib/plans.ts` `PAYMENT_LINKS` (funnels uses the legacy `NEXT_PUBLIC_STRIPE_LINK_MONTHLY/YEARLY`), plus `NEXT_PUBLIC_STRIPE_LINK_ALL_{MONTHLY,YEARLY}`. Up to 38 links (18 tools + All Access, monthly + yearly); the exact live set must be listed read-only from the Stripe Dashboard before any change.
- Webhook `app/api/stripe/webhook` → `lib/stripe-webhook.ts`; `STRIPE_PRICE_MAP` (server env, JSON) maps `price_…` / `plink_…` ids to `{tool, plan}`.
- Prices (unchanged): $12/mo or $99/yr per tool; All Access $29/mo or $249/yr.

### Webhook / access with trials — already safe, now tested
- A trial checkout completes with `payment_status: 'no_payment_required'` → `onCheckout` already treats that as paid and grants `app_access` (+ approves the user).
- `customer.subscription.updated` with `trialing` → active (already in `subscriptionStatusActive`); `active` keeps access; `unpaid` / `canceled` / `incomplete_expired` revoke.
- Trial ends without a payment method (with `trial_settings.end_behavior.missing_payment_method = cancel`) → `customer.subscription.deleted` → revoked.
- `customer.subscription.trial_will_end` is ignored (no-op).
- **No code change was needed**; `tests/trial-webhook.test.cjs` locks this behavior in.
- Known gap to decide: `past_due` keeps access (by design for card retries). With a trial, a failed first charge gives access during Stripe's retry window (days, per Dashboard retry settings) before `unpaid`/`canceled` revokes.
- Trial abuse: Payment Links cannot limit "one trial per person". Options: accept it, or (later) a webhook check that cancels a second trial for the same user id / email.

### Can existing Payment Links get a trial?
Stripe's Payment Link **update** API accepts `subscription_data` (`trial_period_days`, `trial_settings`), so **existing links can be updated in place; no new links, no new prices and no URL change are required**. Must be confirmed in test mode first. Updating a link affects every future checkout on that URL immediately.

### Exact plan to present to CTO (needs Cooper's OK; live Stripe change)
1. Read-only: list the live payment links used by the site (ids from the server `.env` values) and confirm each is a recurring-price link.
2. Test mode: on a test payment link set `subscription_data[trial_period_days]=7`, `subscription_data[trial_settings][end_behavior][missing_payment_method]=cancel`, keep `payment_method_collection=always` (card up front, auto-charges on day 8). Run a full test checkout → trial → convert, and trial → cancel, against a staging webhook.
3. Live (one object type changed, **nothing created**): update each in-scope `plink_…` with the same two fields. Recommendation: **monthly links only** (18 tools + All Access = up to 19 links); yearly stays as is. Prices, products and link URLs unchanged.
4. Env/build args: **no change** to `NEXT_PUBLIC_STRIPE_LINK_*` or `STRIPE_PRICE_MAP` (same link and price ids). Optional new copy flag later (`NEXT_PUBLIC_TRIAL_DAYS`, wired in Dockerfile/docker-compose/.env.example with a regression test) to show "7-day free trial" on pricing; not added now.
5. Copy changes before launch: pricing cards + FAQ ("7-day free trial, card required, cancel before day 8 and you are not charged"), Terms/Refund trial paragraph. Until then the site must not mention a trial.
6. Webhook: no code change. Stripe Dashboard: confirm `customer.subscription.updated` and `customer.subscription.deleted` are enabled on the endpoint (they are handled; must be subscribed).
7. Rollback: set `trial_period_days` back to empty on the same links.

## B. Welcome emails day 0/2/5

### Sending path found in the repo
- There is **no Gmail/SMTP sending code or env var** (no `SMTP_*`, `GMAIL_*`, app-password var). Every working sender uses **Resend** with `RESEND_API_KEY` and a `@saasnation.site` from address (`BOOKING_EMAIL_FROM`, `EMAILLIST_EMAIL_FROM`, `DOWNLOADS_EMAIL_FROM`); `cooperfeatherstonellc@gmail.com` is `SUPPORT_EMAIL`.
- The scaffold therefore sends through Resend from `WELCOME_EMAIL_FROM` (no default; must be set) with **reply-to cooperfeatherstonellc@gmail.com**. **Cooper/CTO must confirm this is the approved path** (or name a Gmail/SMTP path to wire instead) before anything is turned on.
- Legacy: `app/api/emails/welcome` (called from /auth/register) sends a one-off welcome via `lib/email.ts` from `onboarding@funnelmaker.app` **if `RESEND_API_KEY` is set on the server**. Left unchanged. Retire it when the new day-0 email goes live so nobody gets two.

### What was built (all OFF)
- `lib/welcome/core.ts` — modes, eligibility, step timing, templates (`renderWelcome`).
- `lib/welcome/run.ts` — `runWelcome()`; `app/api/cron/welcome` (POST, needs `Authorization: Bearer $CRON_SECRET`; unset = 401). **No schedule is configured.**
- `app/api/welcome/unsubscribe?t=<token>` — GET shows a confirm button, POST (button or RFC 8058 one-click) sets `opted_out`.
- Migration `20261101c_welcome_emails.sql`: `welcome_email_prefs` (per-user random `unsub_token`, `opted_out`) and `welcome_email_sends` (unique `user_id, step`). Service role only, RLS forced.

### Safety rules in code
- `WELCOME_EMAILS_ENABLED` must be exactly `true`, else nothing runs. Even then it is a **dry run** (reads only, logs counts per step, writes nothing, sends nothing) unless `WELCOME_EMAILS_DRY_RUN=false`, **and** `WELCOME_EMAILS_START_AT`, `WELCOME_EMAIL_FROM` and `RESEND_API_KEY` are set.
- Only `auth.users` who signed up themselves: confirmed email, not invited, not anonymous/banned, not demo, created on/after `WELCOME_EMAILS_START_AT` (so existing users are never mass-mailed). Free-tool captured emails, update signups and email-list contacts are never read.
- One step per run per user; each step claimed in `welcome_email_sends` before the send (max one per step per user); a step more than 2 days late is skipped, never batched; max 50 sends per run; opt-out honored; List-Unsubscribe headers.

### Previews
`docs/welcome-previews/day{0,2,5}.{html,txt,png}`.

### To turn on (needs Cooper OK)
1. Confirm sender (Resend `WELCOME_EMAIL_FROM` on saasnation.site with reply-to Gmail, or another path) and the copy.
2. Set `CRON_SECRET`, `WELCOME_EMAILS_ENABLED=true` (dry run), `WELCOME_EMAILS_START_AT=<go-live time>`; call the trigger once and read the counts.
3. Then `WELCOME_EMAILS_DRY_RUN=false`, add an hourly cron calling the trigger, retire the legacy welcome route.
