-- "Get new tools as they ship" signups from the public homepage. Additive only.
-- RLS on with NO policies, and all grants revoked from anon/authenticated: nobody but the service role
-- (server route /api/updates/subscribe) can read or write rows. No email is sent from this table.
create table if not exists public.tool_updates_signups (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source_page text not null default '/' check (char_length(source_page) <= 200),
  consent_text text not null check (char_length(consent_text) between 10 and 1000),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists tool_updates_signups_email_key on public.tool_updates_signups (lower(email));
alter table public.tool_updates_signups enable row level security;
alter table public.tool_updates_signups force row level security;
revoke all on table public.tool_updates_signups from public, anon, authenticated;
revoke all on sequence public.tool_updates_signups_id_seq from public, anon, authenticated;
grant all on table public.tool_updates_signups to service_role;
grant usage, select on sequence public.tool_updates_signups_id_seq to service_role;
comment on table public.tool_updates_signups is 'Homepage "new tools" signups. Service role only. Consent text/time stored per row; unsubscribed_at marks opt-out.';
