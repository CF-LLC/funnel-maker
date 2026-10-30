-- Expense tracker. Additive only: 'expenses' allowed in app_access; ex_* tables with owner-only RLS via ex_has_access();
-- a PRIVATE ex-receipts bucket (10 MB per file, images/PDF, owner folder); expenses_public flag (OFF).
-- Billable expenses go onto a NEW unpaid invoice in the EXISTING Invoices tables. Deleting that invoice sets
-- ex_expenses.invoice_id to NULL (FK on delete set null) and a trigger clears invoiced_at, so they are unbilled again.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','changelog','approvals','time','expenses','all']));

create or replace function public.ex_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('expenses', 'all') and active) $$;
revoke all on function public.ex_has_access(uuid) from public, anon;
grant execute on function public.ex_has_access(uuid) to authenticated, service_role;

create table if not exists public.ex_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists ex_categories_user_name on public.ex_categories (user_id, lower(btrim(name)));

create table if not exists public.ex_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expense_date date not null,
  amount_cents bigint not null check (amount_cents between 1 and 10000000000),
  vendor text not null check (char_length(btrim(vendor)) between 1 and 120),
  category_id uuid references public.ex_categories(id) on delete set null,
  crm_email text check (crm_email is null or (crm_email = lower(btrim(crm_email)) and char_length(crm_email) between 3 and 320)),
  tt_project_id uuid references public.tt_projects(id) on delete set null,
  billable boolean not null default false,
  note text check (char_length(note) <= 500),
  receipt_path text check (receipt_path is null or char_length(receipt_path) <= 300),
  receipt_name text check (receipt_name is null or char_length(receipt_name) <= 200),
  receipt_mime text check (receipt_mime is null or receipt_mime in ('application/pdf','image/png','image/jpeg','image/webp','image/heic')),
  receipt_bytes bigint check (receipt_bytes is null or receipt_bytes between 1 and 10485760),
  invoice_id uuid references public.inv_invoices(id) on delete set null,
  invoiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ex_receipt_complete check ((receipt_path is null) = (receipt_bytes is null) and (receipt_path is null) = (receipt_mime is null))
);
create index if not exists ex_expenses_user_date_idx on public.ex_expenses (user_id, expense_date desc);
create index if not exists ex_expenses_invoice_idx on public.ex_expenses (invoice_id) where invoice_id is not null;

create or replace function public.ex_check_expense()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null and not exists (select 1 from public.ex_categories c where c.id = new.category_id and c.user_id = new.user_id) then
    raise exception 'category not owned' using errcode = '42501';
  end if;
  if new.tt_project_id is not null and not exists (select 1 from public.tt_projects p where p.id = new.tt_project_id and p.user_id = new.user_id) then
    raise exception 'project not owned' using errcode = '42501';
  end if;
  if new.receipt_path is not null and split_part(new.receipt_path, '/', 1) <> new.user_id::text then
    raise exception 'receipt not owned' using errcode = '42501';
  end if;
  if new.receipt_bytes is not null and (tg_op = 'INSERT' or new.receipt_bytes is distinct from old.receipt_bytes)
     and (select coalesce(sum(receipt_bytes), 0) from public.ex_expenses where user_id = new.user_id and id <> new.id) + new.receipt_bytes > 524288000 then
    raise exception 'receipt storage full (500 MB)' using errcode = '54000';
  end if;
  if new.invoice_id is null then
    new.invoiced_at := null;  -- invoice deleted (FK set null) or unlinked: back to unbilled
  elsif not exists (select 1 from public.inv_invoices i where i.id = new.invoice_id and i.user_id = new.user_id) then
    raise exception 'invoice not owned' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.invoice_id is not null and new.invoice_id is not null
     and (new.amount_cents, new.billable) is distinct from (old.amount_cents, old.billable) then
    raise exception 'billed expenses are locked; delete the invoice first';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.ex_check_expense() from public, anon, authenticated;
drop trigger if exists ex_expenses_check on public.ex_expenses;
create trigger ex_expenses_check before insert or update on public.ex_expenses for each row execute function public.ex_check_expense();

alter table public.ex_categories enable row level security;
alter table public.ex_expenses enable row level security;
create policy ex_categories_select_own on public.ex_categories for select to authenticated using (user_id = auth.uid());
create policy ex_categories_insert_own on public.ex_categories for insert to authenticated with check (user_id = auth.uid() and public.ex_has_access(auth.uid()));
create policy ex_categories_update_own on public.ex_categories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.ex_has_access(auth.uid()));
create policy ex_categories_delete_own on public.ex_categories for delete to authenticated using (user_id = auth.uid());
create policy ex_expenses_select_own on public.ex_expenses for select to authenticated using (user_id = auth.uid());
create policy ex_expenses_insert_own on public.ex_expenses for insert to authenticated with check (user_id = auth.uid() and public.ex_has_access(auth.uid()));
create policy ex_expenses_update_own on public.ex_expenses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.ex_has_access(auth.uid()));
create policy ex_expenses_delete_own on public.ex_expenses for delete to authenticated using (user_id = auth.uid());

revoke all on public.ex_categories, public.ex_expenses from anon;
revoke all on public.ex_categories, public.ex_expenses from authenticated;
grant select, delete on public.ex_categories, public.ex_expenses to authenticated;
grant insert (user_id, name) on public.ex_categories to authenticated;
grant update (name, archived) on public.ex_categories to authenticated;
grant insert (user_id, expense_date, amount_cents, vendor, category_id, crm_email, tt_project_id, billable, note) on public.ex_expenses to authenticated;
grant update (expense_date, amount_cents, vendor, category_id, crm_email, tt_project_id, billable, note,
  receipt_path, receipt_name, receipt_mime, receipt_bytes, invoice_id, invoiced_at) on public.ex_expenses to authenticated;

-- PRIVATE bucket: 10 MB per file, images + PDF. No anon policies, so the public can't list or read. Owner folder = user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ex-receipts', 'ex-receipts', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp','image/heic'])
on conflict (id) do nothing;
create policy ex_receipts_obj_select_own on storage.objects for select to authenticated
  using (bucket_id = 'ex-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy ex_receipts_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'ex-receipts' and (storage.foldername(name))[1] = auth.uid()::text and public.ex_has_access(auth.uid()));
create policy ex_receipts_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'ex-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.feature_flags (key, enabled, description)
values ('expenses_public', false, 'Show Expenses on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
