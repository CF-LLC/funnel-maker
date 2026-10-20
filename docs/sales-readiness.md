# Funnel Maker sales readiness (Oct 20, 2026)

## How a purchase becomes access
1. User signs up (Turnstile-protected) and confirms email.
2. /pricing shows Stripe Payment Links (env `NEXT_PUBLIC_STRIPE_LINK_MONTHLY|YEARLY|FOUNDING`, build-time).
   Links are only used if they are `https://buy.stripe.com/...`; the app appends `client_reference_id=<user id>` and `prefilled_email`.
3. **No webhook.** Nothing in the app records the payment automatically. An admin checks Stripe and, in
   /dashboard/admin/approvals, sets `approved=true`, `plan`, `paid_until` for the account (match by email or by the
   Checkout Session's `client_reference_id`).
4. Publishing is enforced in Postgres by trigger `fm_enforce_publish` (approved account, max 3 live funnels).
   Users cannot change `approved`/`plan`/`paid_until` themselves (trigger `fm_guard_user_approval`).
5. Legacy `/api/billing/{checkout,portal,webhook}` return 410 (they targeted an old schema and could create Stripe objects).

## Known gaps
- Activation is manual; `paid_until` is informational (expiry does not unpublish funnels).
- To automate later: a Stripe webhook endpoint for `checkout.session.completed`, `customer.subscription.updated|deleted`
  that maps `client_reference_id` -> `public.users.id` and sets approved/plan/paid_until. Needs `STRIPE_SECRET_KEY`
  (restricted, read) and `STRIPE_WEBHOOK_SECRET` in the server env.

## Onboarding emails
`/api/emails/welcome` exists (Resend) but `RESEND_API_KEY` is not set, so nothing is sent. The route now requires a
signed-in user and only targets their own address. Sender domain in code is `funnelmaker.app` (not verified).
