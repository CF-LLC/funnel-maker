-- Additive: per-side reward markers for "give a month, get a month" (Option B coupons). Nothing is granted unless REFERRALS_REWARDS_ENABLED.
alter table public.referral_attributions add column if not exists referred_reward_at timestamptz;
alter table public.referral_attributions add column if not exists referrer_reward_at timestamptz;
create index if not exists referral_attributions_referrer_reward_idx on public.referral_attributions (referrer_id, referrer_reward_at);
