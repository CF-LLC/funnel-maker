-- funnel-maker v1: manual plan/payment tracking (Stripe Payment Links, no webhooks).
-- Create-only: add columns + create-or-replace. No drops, no data changes.

alter table public.users add column if not exists plan text check (plan in ('monthly', 'yearly', 'founding'));
alter table public.users add column if not exists paid_until date;

-- Extend the guard: approval AND plan/payment fields are admin-only (service role or DB admin).
create or replace function public.fm_guard_user_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.approved := false;
      new.approved_at := null;
      new.plan := null;
      new.paid_until := null;
    elsif new.approved is distinct from old.approved
       or new.approved_at is distinct from old.approved_at
       or new.plan is distinct from old.plan
       or new.paid_until is distinct from old.paid_until then
      raise exception 'approval_is_admin_only' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
