-- Additive + idempotent. Referral groundwork ("give a month, get a month"): codes and attributions only.
-- No rewards are granted by the database or the app. Rewards stay OFF (REFERRALS_REWARDS_ENABLED unset) and,
-- when approved, would be applied by the Stripe webhook (see docs/REFERRALS.md). Service role only.
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{8}$' and code ~ '[0-9]'),
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
alter table public.referral_codes force row level security;
revoke all on public.referral_codes from public, anon, authenticated;
grant select, insert on public.referral_codes to service_role;

create table if not exists public.referral_attributions (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9]{8}$'),
  status text not null default 'signed_up' check (status in ('signed_up', 'paid', 'rewarded', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_id <> referred_user_id)
);
create index if not exists referral_attributions_referrer_idx on public.referral_attributions (referrer_id);
alter table public.referral_attributions enable row level security;
alter table public.referral_attributions force row level security;
revoke all on public.referral_attributions from public, anon, authenticated;
grant select, insert, update on public.referral_attributions to service_role;

-- Widen (never narrow) the site_events event check with two referral events; every existing row stays valid.
alter table public.site_events drop constraint if exists site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event in ('pageview','signup_started','signup_completed','checkout_clicked','checkout_completed','free_tool_used','email_captured','upgrade_clicked','referral_landed','referral_signup'));
