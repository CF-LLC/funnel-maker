-- funnel-maker v1: templates, manual approval, live-funnel limit, PDF storage.
-- Create-only: add-column-if-not-exists, create-or-replace, guarded creates. No drops, no data changes.

alter table public.users add column if not exists approved boolean not null default false;
alter table public.users add column if not exists approved_at timestamptz;
alter table public.users add column if not exists signup_template text;
alter table public.funnels add column if not exists template text;

-- Only the service role (admin approval route) or a DB admin may change approval.
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
    elsif new.approved is distinct from old.approved or new.approved_at is distinct from old.approved_at then
      raise exception 'approval_is_admin_only' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'fm_guard_user_approval' and tgrelid = 'public.users'::regclass) then
    create trigger fm_guard_user_approval before insert or update on public.users
      for each row execute function public.fm_guard_user_approval();
  end if;
end $$;

-- Signup: also remember the template picked on the signup form.
create or replace function public.fm_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl text := new.raw_user_meta_data ->> 'template';
begin
  if v_tpl not in ('book-call', 'sales-page', 'free-download') then v_tpl := null; end if;
  insert into public.users (id, email, signup_template) values (new.id, new.email, v_tpl)
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.fm_handle_new_user() from public, anon, authenticated;

-- Publishing: account must be approved, and at most 3 live funnels per user. Enforced in the DB,
-- so it holds no matter which client (app, REST) makes the change.
create or replace function public.fm_enforce_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live int;
begin
  if auth.role() = 'service_role' then return new; end if;
  if new.is_public and (tg_op = 'INSERT' or coalesce(old.is_public, false) = false) then
    if not exists (select 1 from public.users where id = new.user_id and approved) then
      raise exception 'account_pending_approval' using errcode = 'P0001';
    end if;
    select count(*) into v_live from public.funnels
      where user_id = new.user_id and is_public and id <> new.id;
    if v_live >= 3 then
      raise exception 'live_funnel_limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.fm_enforce_publish() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'fm_enforce_publish' and tgrelid = 'public.funnels'::regclass) then
    create trigger fm_enforce_publish before insert or update of is_public on public.funnels
      for each row execute function public.fm_enforce_publish();
  end if;
end $$;

-- PDF uploads for Free download funnels: public-read bucket, 10 MB, PDF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fm-downloads', 'fm-downloads', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fm_downloads_owner_insert') then
    create policy fm_downloads_owner_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'fm-downloads' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fm_downloads_owner_select') then
    create policy fm_downloads_owner_select on storage.objects for select to authenticated
      using (bucket_id = 'fm-downloads' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
