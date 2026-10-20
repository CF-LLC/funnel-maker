-- SaaS Nation per-tool access + optional signup "wish" question. Additive only: no drops, no data deletes.

alter table public.users add column if not exists wish_tool text;

create table if not exists public.app_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tool text not null check (tool in ('funnels', 'invoices')),
  plan text,
  source text not null check (source in ('founding', 'single', 'all_access', 'manual')),
  active boolean not null default true,
  founding_lapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tool)
);

alter table public.app_access enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='app_access' and policyname='app_access_read_own') then
    create policy app_access_read_own on public.app_access for select to authenticated
      using (user_id = auth.uid() or public.fm_is_admin(auth.uid()));
  end if;
end $$;
-- No insert/update/delete policies: writes only via service role (admin API) or DB admin.
revoke insert, update, delete on public.app_access from anon, authenticated;

-- Founding invoices access lives only while funnels access is active.
-- Funnels row going inactive (or deleted) => founding invoices row inactive + founding_lapsed (permanent).
-- A lapsed founding row can't be reactivated as founding; grant it again as single/all_access instead.
create or replace function public.app_access_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.tool = 'funnels' then
      update public.app_access set active = false, founding_lapsed = true, updated_at = now()
        where user_id = old.user_id and tool = 'invoices' and source = 'founding';
    end if;
    return old;
  end if;
  new.updated_at := now();
  if new.tool = 'invoices' and new.source = 'founding' and new.active then
    if new.founding_lapsed then
      raise exception 'founding_lapsed: grant invoices as single or all_access' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.app_access where user_id = new.user_id and tool = 'funnels' and active) then
      raise exception 'founding_requires_active_funnels' using errcode = 'P0001';
    end if;
  end if;
  if new.tool = 'invoices' and new.source <> 'founding' then
    new.founding_lapsed := coalesce(new.founding_lapsed, false);
  end if;
  return new;
end $$;

create or replace function public.app_access_cascade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tool = 'funnels' and not new.active and coalesce(old.active, true) then
    update public.app_access set active = false, founding_lapsed = true
      where user_id = new.user_id and tool = 'invoices' and source = 'founding';
  end if;
  return null;
end $$;
revoke all on function public.app_access_rules() from public, anon, authenticated;
revoke all on function public.app_access_cascade() from public, anon, authenticated;

drop trigger if exists app_access_rules on public.app_access;
create trigger app_access_rules before insert or update or delete on public.app_access
  for each row execute function public.app_access_rules();
drop trigger if exists app_access_cascade on public.app_access;
create trigger app_access_cascade after update of active on public.app_access
  for each row execute function public.app_access_cascade();

-- Signup: store template + optional wish (trimmed, max 500 chars).
create or replace function public.fm_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tpl text := new.raw_user_meta_data ->> 'template';
  v_wish text := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'wish_tool', '')), 500), '');
begin
  if v_tpl not in ('book-call', 'sales-page', 'free-download') then v_tpl := null; end if;
  insert into public.users (id, email, signup_template, wish_tool) values (new.id, new.email, v_tpl, v_wish)
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.fm_handle_new_user() from public, anon, authenticated;

-- Backfill: approved users get funnels access; they are founding funnel-maker users, so invoices too.
insert into public.app_access (user_id, tool, plan, source, active)
select id, 'funnels', plan, 'single', true from public.users where approved
on conflict (user_id, tool) do nothing;
insert into public.app_access (user_id, tool, plan, source, active)
select id, 'invoices', plan, 'founding', true from public.users where approved
on conflict (user_id, tool) do nothing;
