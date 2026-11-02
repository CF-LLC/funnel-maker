-- Additive + idempotent. Cookieless, first-party site analytics and free-tool email capture.
-- site_events: no IP, no email, no user id, no cookie id. visitor_hash is a salted hash that rotates daily
-- (computed server-side, the salt is never stored), so visitors can't be followed across days.
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  day date not null default (now() at time zone 'utc')::date,
  event text not null check (event in ('pageview','signup_started','signup_completed','checkout_clicked','checkout_completed','free_tool_used','email_captured','upgrade_clicked')),
  path text check (path is null or char_length(path) <= 200),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 100),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  device text check (device is null or device in ('mobile','tablet','desktop')),
  visitor_hash text check (visitor_hash is null or visitor_hash ~ '^[0-9a-f]{16}$'),
  tool text check (tool is null or char_length(tool) <= 60),
  plan text check (plan is null or char_length(plan) <= 40),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists site_events_day_event_idx on public.site_events (day, event);
alter table public.site_events enable row level security;
alter table public.site_events force row level security;
revoke all on public.site_events from public, anon, authenticated;
grant select, insert on public.site_events to service_role;

-- free_tool_emails: optional "email me this / tips" box on free tools. Capture only; nothing is ever sent from here.
create table if not exists public.free_tool_emails (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 6 and 320 and email = lower(email)),
  source_tool text not null check (char_length(source_tool) <= 60),
  consent_text text not null check (char_length(consent_text) <= 500),
  consented_at timestamptz not null default now(),
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists free_tool_emails_email_tool_uidx on public.free_tool_emails (email, source_tool);
alter table public.free_tool_emails enable row level security;
alter table public.free_tool_emails force row level security;
revoke all on public.free_tool_emails from public, anon, authenticated;
grant select, insert, update on public.free_tool_emails to service_role;
