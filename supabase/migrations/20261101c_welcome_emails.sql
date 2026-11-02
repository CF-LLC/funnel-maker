-- Additive + idempotent. Welcome emails (day 0/2/5) bookkeeping. Nothing here sends email; sending is OFF
-- (WELCOME_EMAILS_ENABLED unset) and the default mode is dry run. Service role only.
create table if not exists public.welcome_email_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unsub_token uuid not null unique default gen_random_uuid(),
  opted_out boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.welcome_email_prefs enable row level security;
alter table public.welcome_email_prefs force row level security;
revoke all on public.welcome_email_prefs from public, anon, authenticated;
grant select, insert, update on public.welcome_email_prefs to service_role;

-- At most one row per user per step (unique), claimed before any send.
create table if not exists public.welcome_email_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  step smallint not null check (step in (0, 2, 5)),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  unique (user_id, step)
);
alter table public.welcome_email_sends enable row level security;
alter table public.welcome_email_sends force row level security;
revoke all on public.welcome_email_sends from public, anon, authenticated;
grant select, insert, update on public.welcome_email_sends to service_role;
