-- Invoices section (tool #2) inside funnel-maker. New inv_* tables only; additive.

create or replace function public.inv_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool = 'invoices' and active) $$;
revoke all on function public.inv_has_access(uuid) from public, anon;
grant execute on function public.inv_has_access(uuid) to authenticated;

create table if not exists public.inv_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  business_name text not null default '' check (length(business_name) <= 200),
  business_email text not null default '' check (length(business_email) <= 320),
  business_address text not null default '' check (length(business_address) <= 1000),
  pay_link text check (pay_link is null or pay_link ~ '^https://(buy\.stripe\.com|checkout\.stripe\.com)/'),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  email text check (email is null or length(email) <= 320),
  address text check (address is null or length(address) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.inv_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  description text not null check (length(description) between 1 and 500),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inv_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  client_id uuid references public.inv_clients(id) on delete set null,
  number text not null check (length(number) between 1 and 40),
  issue_date date not null default current_date,
  due_date date not null,
  client_name text not null check (length(client_name) between 1 and 200),
  client_email text check (client_email is null or length(client_email) <= 320),
  client_address text check (client_address is null or length(client_address) <= 1000),
  seller_name text not null default '' check (length(seller_name) <= 200),
  seller_email text not null default '' check (length(seller_email) <= 320),
  seller_address text not null default '' check (length(seller_address) <= 1000),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(5,2) check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  notes text check (notes is null or length(notes) <= 2000),
  pay_link text check (pay_link is null or pay_link ~ '^https://(buy\.stripe\.com|checkout\.stripe\.com)/'),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  paid_at timestamptz,
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create table if not exists public.inv_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.inv_invoices(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  position int not null default 0,
  description text not null check (length(description) between 1 and 500),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0)
);

create index if not exists inv_invoices_user_idx on public.inv_invoices(user_id, status, due_date);
create index if not exists inv_lines_invoice_idx on public.inv_invoice_lines(invoice_id);
create index if not exists inv_clients_user_idx on public.inv_clients(user_id);
create index if not exists inv_items_user_idx on public.inv_items(user_id);

-- Lines must belong to an invoice the same user owns.
create or replace function public.inv_line_owner_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.inv_invoices where id = new.invoice_id and user_id = new.user_id) then
    raise exception 'invoice_not_owned' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.inv_line_owner_check() from public, anon, authenticated;
drop trigger if exists inv_line_owner_check on public.inv_invoice_lines;
create trigger inv_line_owner_check before insert or update on public.inv_invoice_lines
  for each row execute function public.inv_line_owner_check();

create or replace function public.inv_touch()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists inv_touch on public.inv_invoices;
create trigger inv_touch before update on public.inv_invoices for each row execute function public.inv_touch();
drop trigger if exists inv_touch on public.inv_profiles;
create trigger inv_touch before update on public.inv_profiles for each row execute function public.inv_touch();

-- RLS: own rows, and only while the user has active invoices access. Read stays allowed after access ends.
do $$
declare t text;
begin
  foreach t in array array['inv_profiles','inv_clients','inv_items','inv_invoices','inv_invoice_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_select_own') then
      execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t||'_select_own', t);
      execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() and public.inv_has_access(auth.uid()))', t||'_insert_own', t);
      execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.inv_has_access(auth.uid()))', t||'_update_own', t);
      execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid() and public.inv_has_access(auth.uid()))', t||'_delete_own', t);
    end if;
  end loop;
end $$;
-- Public invoice view (/i/[token]) reads via the server's service-role client with a fixed projection; no anon policy.
