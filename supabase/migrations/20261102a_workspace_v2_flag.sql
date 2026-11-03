-- PR 1 (SaaS Nation rework): runtime flag `workspace_v2` with a per-user allowlist. Additive only.
-- feature_flags stays RLS-locked (no policies). Signed-in users read only a boolean for themselves
-- via fm_user_flag(), which is security definer and never exposes the allowlist.

alter table public.feature_flags add column if not exists allow_users uuid[] not null default '{}';

insert into public.feature_flags (key, enabled, description)
values ('workspace_v2', false, 'Client page v2: show portal, time, expenses, approvals, change log, downloads, reports and email list on each client. On for everyone when enabled; otherwise only for allow_users.')
on conflict (key) do nothing;

-- True if the flag is on globally or the caller (auth.uid()) is on its allowlist. Unknown key = false.
create or replace function public.fm_user_flag(flag_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled or (auth.uid() is not null and auth.uid() = any(allow_users))
                   from public.feature_flags where key = flag_key), false)
$$;
revoke all on function public.fm_user_flag(text) from public;
grant execute on function public.fm_user_flag(text) to authenticated;
-- Supabase default privileges also grant anon; signed-out callers never need this.
revoke execute on function public.fm_user_flag(text) from anon;

-- Rollback (run as one transaction):
-- begin;
--   drop function if exists public.fm_user_flag(text);
--   delete from public.feature_flags where key = 'workspace_v2';
--   alter table public.feature_flags drop column if exists allow_users;
-- commit;
