-- Stripe webhook support + All Access as a single tool='all' row. Additive; no data deletes.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'all'));
alter table public.app_access add column if not exists stripe_customer_id text;
alter table public.app_access add column if not exists stripe_subscription_id text;
create index if not exists app_access_sub_idx on public.app_access(stripe_subscription_id) where stripe_subscription_id is not null;

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- Funnels counts as covered if the funnels row OR the all row is active.
create or replace function public.app_access_funnels_covered(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('funnels', 'all') and active) $$;
revoke all on function public.app_access_funnels_covered(uuid) from public, anon, authenticated;

create or replace function public.app_access_lapse_if_uncovered(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.app_access_funnels_covered(uid) then
    update public.app_access set active = false, founding_lapsed = true
      where user_id = uid and tool = 'invoices' and source = 'founding' and (active or not founding_lapsed);
  end if;
end $$;
revoke all on function public.app_access_lapse_if_uncovered(uuid) from public, anon, authenticated;

create or replace function public.app_access_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then return old; end if;
  new.updated_at := now();
  if new.tool = 'invoices' and new.source = 'founding' and new.active then
    if new.founding_lapsed then
      raise exception 'founding_lapsed: grant invoices as single or all_access' using errcode = 'P0001';
    end if;
    if not public.app_access_funnels_covered(new.user_id) then
      raise exception 'founding_requires_active_funnels' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create or replace function public.app_access_cascade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.tool in ('funnels', 'all') then perform public.app_access_lapse_if_uncovered(old.user_id); end if;
    return null;
  end if;
  if new.tool in ('funnels', 'all') and not new.active then
    perform public.app_access_lapse_if_uncovered(new.user_id);
  end if;
  return null;
end $$;
revoke all on function public.app_access_rules() from public, anon, authenticated;
revoke all on function public.app_access_cascade() from public, anon, authenticated;

drop trigger if exists app_access_cascade on public.app_access;
create trigger app_access_cascade after update of active or delete on public.app_access
  for each row execute function public.app_access_cascade();

-- Invoices RLS helper honours All Access.
create or replace function public.inv_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('invoices', 'all') and active) $$;
