-- Report kit (monthly KPI reports for clients). Additive only: 'reports' allowed in app_access; rp_* tables with
-- owner-only RLS via rp_has_access(); a PRIVATE rp-files bucket (screenshots + logo, PNG/JPEG, 10 MB per file,
-- 500 MB per account); reports_public flag (OFF). Clients never touch tables or Storage: /r/<token> and its PDF go
-- through server code (service role) that checks the client's token, the revoked flag and the owner's access.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','changelog','approvals','time','expenses','reports','all']));

create or replace function public.rp_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('reports', 'all') and active) $$;
revoke all on function public.rp_has_access(uuid) from public, anon;
grant execute on function public.rp_has_access(uuid) to authenticated, service_role;

create table if not exists public.rp_brand (
  user_id uuid primary key references public.users(id) on delete cascade,
  business_name text check (business_name is null or char_length(business_name) <= 120),
  logo_path text check (logo_path is null or (char_length(logo_path) <= 500 and split_part(logo_path, '/', 1) = user_id::text and split_part(logo_path, '/', 2) = 'logo')),
  logo_bytes bigint check (logo_bytes is null or logo_bytes between 1 and 10485760),
  updated_at timestamptz not null default now()
);

create table if not exists public.rp_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (email is null or (email = lower(email) and char_length(email) <= 200)),
  template jsonb not null default '{}'::jsonb check (jsonb_typeof(template) = 'object' and pg_column_size(template) <= 20000),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) check (token ~ '^[0-9a-f]{64}$'),
  revoked boolean not null default false,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rp_clients_user_idx on public.rp_clients (user_id, created_at desc);

create table if not exists public.rp_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.rp_clients(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  layout jsonb not null default '{}'::jsonb check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) <= 20000),
  kpi_values jsonb not null default '{}'::jsonb check (jsonb_typeof(kpi_values) = 'object' and pg_column_size(kpi_values) <= 10000),
  notes text check (notes is null or char_length(notes) <= 5000),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);
create index if not exists rp_reports_client_idx on public.rp_reports (client_id, month desc);

create table if not exists public.rp_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  report_id uuid not null references public.rp_reports(id) on delete cascade,
  slot integer not null check (slot between 0 and 11),
  path text not null unique check (char_length(path) <= 500 and split_part(path, '/', 1) = user_id::text and split_part(path, '/', 2) = report_id::text),
  name text not null check (char_length(name) between 1 and 200),
  mime text not null check (mime in ('image/png', 'image/jpeg')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  unique (report_id, slot)
);

-- Ownership + the 500 MB per-account cap (screenshots + logo), enforced in the database.
create or replace function public.rp_check_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare used bigint;
begin
  if tg_table_name = 'rp_reports' then
    if not exists (select 1 from public.rp_clients c where c.id = new.client_id and c.user_id = new.user_id) then raise exception 'client not owned'; end if;
    return new;
  end if;
  if tg_table_name = 'rp_images' then
    if not exists (select 1 from public.rp_reports r where r.id = new.report_id and r.user_id = new.user_id) then raise exception 'report not owned'; end if;
  end if;
  select coalesce((select sum(size_bytes) from public.rp_images where user_id = new.user_id and id is distinct from (to_jsonb(new) ->> 'id')::uuid), 0)
       + coalesce((select logo_bytes from public.rp_brand where user_id = new.user_id and tg_table_name <> 'rp_brand'), 0)
       + coalesce((to_jsonb(new) ->> (case when tg_table_name = 'rp_brand' then 'logo_bytes' else 'size_bytes' end))::bigint, 0)
    into used;
  if used > 524288000 then raise exception 'storage cap reached' using errcode = '54000'; end if;
  return new;
end $$;
revoke all on function public.rp_check_child() from public, anon, authenticated;
drop trigger if exists rp_reports_owned on public.rp_reports;
create trigger rp_reports_owned before insert or update on public.rp_reports for each row execute function public.rp_check_child();
drop trigger if exists rp_images_owned on public.rp_images;
create trigger rp_images_owned before insert or update on public.rp_images for each row execute function public.rp_check_child();
drop trigger if exists rp_brand_cap on public.rp_brand;
create trigger rp_brand_cap before insert or update on public.rp_brand for each row execute function public.rp_check_child();

alter table public.rp_brand enable row level security;
alter table public.rp_clients enable row level security;
alter table public.rp_reports enable row level security;
alter table public.rp_images enable row level security;

create policy rp_brand_select_own on public.rp_brand for select to authenticated using (user_id = auth.uid());
create policy rp_brand_insert_own on public.rp_brand for insert to authenticated with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_brand_update_own on public.rp_brand for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_clients_select_own on public.rp_clients for select to authenticated using (user_id = auth.uid());
create policy rp_clients_insert_own on public.rp_clients for insert to authenticated with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_clients_update_own on public.rp_clients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_clients_delete_own on public.rp_clients for delete to authenticated using (user_id = auth.uid());
create policy rp_reports_select_own on public.rp_reports for select to authenticated using (user_id = auth.uid());
create policy rp_reports_insert_own on public.rp_reports for insert to authenticated with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_reports_update_own on public.rp_reports for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_reports_delete_own on public.rp_reports for delete to authenticated using (user_id = auth.uid());
create policy rp_images_select_own on public.rp_images for select to authenticated using (user_id = auth.uid());
create policy rp_images_insert_own on public.rp_images for insert to authenticated with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_images_update_own on public.rp_images for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rp_has_access(auth.uid()));
create policy rp_images_delete_own on public.rp_images for delete to authenticated using (user_id = auth.uid());

revoke all on public.rp_brand, public.rp_clients, public.rp_reports, public.rp_images from anon;
revoke all on public.rp_brand, public.rp_clients, public.rp_reports, public.rp_images from authenticated;
grant select on public.rp_brand, public.rp_clients, public.rp_reports, public.rp_images to authenticated;
grant delete on public.rp_clients, public.rp_reports, public.rp_images to authenticated;
grant insert (user_id, business_name, logo_path, logo_bytes, updated_at) on public.rp_brand to authenticated;
grant update (business_name, logo_path, logo_bytes, updated_at) on public.rp_brand to authenticated;
grant insert (user_id, name, email, template) on public.rp_clients to authenticated;
grant update (name, email, template, token, revoked, updated_at) on public.rp_clients to authenticated;
grant insert (user_id, client_id, month, title, layout, kpi_values, notes, shared) on public.rp_reports to authenticated;
grant update (title, layout, kpi_values, notes, shared, updated_at) on public.rp_reports to authenticated;
grant insert (user_id, report_id, slot, path, name, mime, size_bytes, caption) on public.rp_images to authenticated;
grant update (caption) on public.rp_images to authenticated;

-- PRIVATE bucket. No anon policies, so the public can't list or read; clients get 120-second signed links from the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rp-files', 'rp-files', false, 10485760, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;
create policy rp_files_obj_select_own on storage.objects for select to authenticated
  using (bucket_id = 'rp-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy rp_files_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'rp-files' and (storage.foldername(name))[1] = auth.uid()::text and public.rp_has_access(auth.uid()));
create policy rp_files_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'rp-files' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.feature_flags (key, enabled, description)
values ('reports_public', false, 'Show Report kit on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
