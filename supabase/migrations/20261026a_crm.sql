-- Client list (CRM). Additive: two owner-only tables, crm_has_access(), 'crm' allowed in app_access.
-- Contacts themselves are aggregated in app code from Forms/funnel leads, Bookings, Proposals and Invoices
-- using the signed-in user's session (existing owner RLS); these tables only hold what the CRM adds.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','all']));

create or replace function public.crm_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('crm', 'all') and active) $$;
revoke all on function public.crm_has_access(uuid) from public, anon;
grant execute on function public.crm_has_access(uuid) to authenticated, service_role;

create table if not exists public.crm_contacts (
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  name text check (char_length(name) <= 200),
  phone text check (char_length(phone) <= 50),
  company text check (char_length(company) <= 200),
  status text not null default 'lead' check (status in ('lead','active','past','not_a_fit')),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, email)
);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_notes_user_email_idx on public.crm_notes (user_id, email, created_at desc);

alter table public.crm_contacts enable row level security;
alter table public.crm_notes enable row level security;

create policy crm_contacts_select_own on public.crm_contacts for select to authenticated using (user_id = auth.uid());
create policy crm_contacts_insert_own on public.crm_contacts for insert to authenticated with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));
create policy crm_contacts_update_own on public.crm_contacts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));
create policy crm_contacts_delete_own on public.crm_contacts for delete to authenticated using (user_id = auth.uid());

create policy crm_notes_select_own on public.crm_notes for select to authenticated using (user_id = auth.uid());
create policy crm_notes_insert_own on public.crm_notes for insert to authenticated with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));
create policy crm_notes_update_own on public.crm_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));
create policy crm_notes_delete_own on public.crm_notes for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.crm_contacts, public.crm_notes to authenticated;
