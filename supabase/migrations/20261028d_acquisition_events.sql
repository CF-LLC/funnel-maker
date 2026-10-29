-- Additive. First-party acquisition funnel (visit / free tool use -> signup), keyed by a random anonymous visitor id cookie.
-- No PII here: no email, no IP. Written and read only by the server with the service role.
create table if not exists public.acquisition_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  kind text not null check (kind in ('visit', 'free_tool', 'signup')),
  path text check (char_length(path) <= 200),
  free_tool text check (char_length(free_tool) <= 60),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists acquisition_events_visitor_idx on public.acquisition_events (visitor_id);
create index if not exists acquisition_events_created_idx on public.acquisition_events (created_at desc);
create unique index if not exists acquisition_events_one_signup_per_user on public.acquisition_events (user_id) where kind = 'signup';
alter table public.acquisition_events enable row level security;
alter table public.acquisition_events force row level security;
revoke all on public.acquisition_events from public, anon, authenticated;
grant select, insert on public.acquisition_events to service_role;
