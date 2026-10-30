-- Time tracking. Additive only: 'time' allowed in app_access; tt_* tables with owner-only RLS via tt_has_access();
-- the timetracking_public flag (OFF). Exports write to the EXISTING Invoices tables (inv_invoices / inv_invoice_lines).
-- Deleting an invoice sets tt_entries.invoice_id to NULL (FK on delete set null) and a trigger clears invoiced_at,
-- so those entries are unbilled again. One running timer per user (partial unique index).

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','changelog','approvals','time','all']));

create or replace function public.tt_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('time', 'all') and active) $$;
revoke all on function public.tt_has_access(uuid) from public, anon;
grant execute on function public.tt_has_access(uuid) to authenticated, service_role;

create table if not exists public.tt_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  default_rate_cents bigint check (default_rate_cents is null or default_rate_cents between 0 and 100000000),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.tt_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or (email = lower(btrim(email)) and char_length(email) between 3 and 320)),
  crm_email text check (crm_email is null or (crm_email = lower(btrim(crm_email)) and char_length(crm_email) between 3 and 320)),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tt_clients_user_idx on public.tt_clients (user_id, name);

create table if not exists public.tt_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.tt_clients(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  hourly_rate_cents bigint check (hourly_rate_cents is null or hourly_rate_cents between 0 and 100000000),
  billable boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tt_projects_user_idx on public.tt_projects (user_id, client_id);

create table if not exists public.tt_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.tt_projects(id) on delete cascade,
  entry_date date not null,
  started_at timestamptz,
  seconds integer check (seconds is null or seconds between 0 and 86400),
  note text check (char_length(note) <= 500),
  billable boolean not null default true,
  invoice_id uuid references public.inv_invoices(id) on delete set null,
  invoiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tt_entries_running_has_start check (seconds is not null or started_at is not null)
);
create index if not exists tt_entries_user_date_idx on public.tt_entries (user_id, entry_date desc);
create index if not exists tt_entries_invoice_idx on public.tt_entries (invoice_id) where invoice_id is not null;
create unique index if not exists tt_entries_one_running on public.tt_entries (user_id) where seconds is null;

create or replace function public.tt_check_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.tt_clients c where c.id = new.client_id and c.user_id = new.user_id) then
    raise exception 'client not owned' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.tt_check_project() from public, anon, authenticated;
drop trigger if exists tt_projects_check on public.tt_projects;
create trigger tt_projects_check before insert or update on public.tt_projects for each row execute function public.tt_check_project();

create or replace function public.tt_check_entry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.tt_projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'project not owned' using errcode = '42501';
  end if;
  if new.invoice_id is null then
    new.invoiced_at := null;  -- invoice deleted (FK set null) or unlinked: back to unbilled
  elsif not exists (select 1 from public.inv_invoices i where i.id = new.invoice_id and i.user_id = new.user_id) then
    raise exception 'invoice not owned' using errcode = '42501';
  elsif new.seconds is null then
    raise exception 'a running timer cannot be billed';
  end if;
  if tg_op = 'UPDATE' and old.invoice_id is not null and new.invoice_id is not null
     and (new.seconds, new.project_id, new.billable) is distinct from (old.seconds, old.project_id, old.billable) then
    raise exception 'billed entries are locked; delete the invoice first';
  end if;
  return new;
end $$;
revoke all on function public.tt_check_entry() from public, anon, authenticated;
drop trigger if exists tt_entries_check on public.tt_entries;
create trigger tt_entries_check before insert or update on public.tt_entries for each row execute function public.tt_check_entry();

alter table public.tt_settings enable row level security;
alter table public.tt_clients enable row level security;
alter table public.tt_projects enable row level security;
alter table public.tt_entries enable row level security;

create policy tt_settings_own on public.tt_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_clients_select_own on public.tt_clients for select to authenticated using (user_id = auth.uid());
create policy tt_clients_insert_own on public.tt_clients for insert to authenticated with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_clients_update_own on public.tt_clients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_clients_delete_own on public.tt_clients for delete to authenticated using (user_id = auth.uid());
create policy tt_projects_select_own on public.tt_projects for select to authenticated using (user_id = auth.uid());
create policy tt_projects_insert_own on public.tt_projects for insert to authenticated with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_projects_update_own on public.tt_projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_projects_delete_own on public.tt_projects for delete to authenticated using (user_id = auth.uid());
create policy tt_entries_select_own on public.tt_entries for select to authenticated using (user_id = auth.uid());
create policy tt_entries_insert_own on public.tt_entries for insert to authenticated with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_entries_update_own on public.tt_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tt_has_access(auth.uid()));
create policy tt_entries_delete_own on public.tt_entries for delete to authenticated using (user_id = auth.uid());

revoke all on public.tt_settings, public.tt_clients, public.tt_projects, public.tt_entries from anon;
revoke all on public.tt_settings, public.tt_clients, public.tt_projects, public.tt_entries from authenticated;
grant select, insert, update, delete on public.tt_settings to authenticated;
grant select, delete on public.tt_clients, public.tt_projects, public.tt_entries to authenticated;
grant insert (user_id, name, email, crm_email) on public.tt_clients to authenticated;
grant update (name, email, crm_email, archived, updated_at) on public.tt_clients to authenticated;
grant insert (user_id, client_id, name, hourly_rate_cents, billable) on public.tt_projects to authenticated;
grant update (client_id, name, hourly_rate_cents, billable, archived, updated_at) on public.tt_projects to authenticated;
grant insert (user_id, project_id, entry_date, started_at, seconds, note, billable) on public.tt_entries to authenticated;
grant update (project_id, entry_date, started_at, seconds, note, billable, invoice_id, invoiced_at, updated_at) on public.tt_entries to authenticated;

insert into public.feature_flags (key, enabled, description)
values ('timetracking_public', false, 'Show Time tracking on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
