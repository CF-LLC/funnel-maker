# Referrals: "give a month, get a month"

Status (Nov 1, 2026): **groundwork only. Rewards are OFF and not implemented.** Nothing in the app touches Stripe for referrals.

## What is live once deployed
- Migration `20261101b_referrals.sql` (additive, idempotent, service role only, RLS forced):
  - `referral_codes` — one code per user (`user_id` primary key), 8 chars `[a-z0-9]` with at least one digit, so it never collides with the "Made with SaaS Nation" tool tags (`?ref=invoices`, letters only).
  - `referral_attributions` — `referrer_id`, `referred_user_id` (unique: a user can be referred once), `code`, `status` (`signed_up` | `paid` | `rewarded` | `rejected`), timestamps; self-referral blocked by a check.
  - `site_events` event check widened (never narrowed) with `referral_landed` (browser) and `referral_signup` (server).
- `?ref=<code>` on any page → stored in a first-party cookie `sn_referral` (30 days, SameSite=Lax) and localStorage (first code wins). A `referral_landed` event is sent unless Do-Not-Track / GPC is on.
- On the first dashboard load after signup, the cookie code is attached once if the account is under 7 days old and is not the referrer's own.
- Dashboard "Refer a friend" card: the user's link and counts (signed up with the link; on a paid plan = has an active `app_access` row). Copy while rewards are off: "Referral tracking is on, and referral rewards are coming soon." No reward is promised.

## Proposed reward (needs CTO + Cooper OK before any build)
Trigger: Stripe webhook `invoice.paid` (or `checkout.session.completed` with `payment_status=paid`) for a referred user's **first real payment** (amount_paid > 0; not a trial start, not a $0 invoice).

Option A (recommended) — **Stripe customer balance credit**:
1. Referred user: `stripe.customers.createBalanceTransaction(customer, { amount: -<one month of the plan they bought>, currency: 'usd', description: 'Referral: 1 month free' })` — $12 (single tool) or $29 (All Access); yearly buyers get one month of the monthly price.
2. Referrer: the same credit on their Stripe customer, sized to *their* current monthly plan, only if they have an active paid subscription (otherwise hold as `paid` and grant when they first pay).
3. Set attribution `status='rewarded'`, store the two balance transaction ids (needs one additive column), idempotent on the Stripe event id (existing `stripe_events` dedupe).
- Pros: no new Stripe products/prices/coupons; credit is applied automatically to the next invoice; works with existing Payment Links.

Option B — **one-time 100%-off coupon** (`duration: once`) applied to the subscription: requires creating a coupon object in live Stripe per plan or a single "1 month free" coupon with `amount_off` per plan (one object each for $12 and $29). More Stripe objects; skip unless A is rejected.

Guards: max rewards per referrer per month (proposal: 5), no reward if the referred user refunds within 14 days (refund webhook sets `rejected` and reverses the credit), same Stripe customer / email = rejected, admin can set `rejected` in /admin.

## What needs OK
- **Cooper/CTO**: the reward itself (Option A vs B), amounts, the monthly cap, and the user-facing copy "Give a month, get a month".
- **Live Stripe changes**: Option A needs none beyond API calls creating balance transactions (still a live money action, so needs OK); Option B creates coupon objects.
- **Env**: set `REFERRALS_REWARDS_ENABLED=true` in the server `.env` only after the webhook code above ships and is tested in Stripe test mode. Until then leave it unset; the card never promises a reward.
- Terms/Refund pages need a short referral paragraph before launch.
