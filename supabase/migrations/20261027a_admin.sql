-- Admin dashboard: error log, admin audit log, runtime feature flags. Additive only.
-- All three tables are RLS-locked with no policies: only the service role (admin-only server handlers) reads/writes.

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  route text not null,
  message text not null,
  detail jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  action text not null,
  target_user_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]{1,60}$'),
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.feature_flags (key, enabled, description)
values ('crm_public', false, 'Show Client list (CRM) on home, pricing and dashboard without a rebuild')
on conflict (key) do nothing;

alter table public.app_errors enable row level security;
alter table public.admin_audit enable row level security;
alter table public.feature_flags enable row level security;
revoke all on public.app_errors, public.admin_audit, public.feature_flags from anon, authenticated;

-- Public read of a single *_public flag (boolean only), so pages can honor runtime launch flags without the service role.
create or replace function public.fm_public_flag(flag_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.feature_flags where key = flag_key and key like '%\_public'), false)
$$;
revoke all on function public.fm_public_flag(text) from public;
grant execute on function public.fm_public_flag(text) to anon, authenticated;
