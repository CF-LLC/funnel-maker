-- Digital downloads store. Additive only: 'downloads' allowed in app_access, dl_* tables with owner-only RLS via
-- dl_has_access(), a PRIVATE dl-files Storage bucket with owner-folder policies, and the downloads_public flag (OFF).
-- Buyers never touch tables or Storage directly: public pages, claims and downloads go through server routes
-- (service role) that hand out 60-second signed URLs.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','all']));

create or replace function public.dl_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('downloads', 'all') and active) $$;
revoke all on function public.dl_has_access(uuid) from public, anon;
grant execute on function public.dl_has_access(uuid) to authenticated, service_role;

-- One storefront per seller.
create table if not exists public.dl_stores (
  user_id uuid primary key references public.users(id) on delete cascade,
  slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  title text check (char_length(title) <= 120),
  blurb text check (char_length(blurb) <= 600),
  accent text not null default '#e50914' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  support_email text check (support_email is null or (support_email = lower(btrim(support_email)) and char_length(support_email) between 3 and 320)),
  -- Delivery email to the buyer (still needs the server switch DOWNLOADS_SEND_ENABLED). Off by default.
  email_delivery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dl_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$'),
  title text not null check (char_length(title) between 1 and 120),
  subtitle text check (char_length(subtitle) <= 200),
  description text check (char_length(description) <= 5000),
  kind text not null default 'pdf' check (kind in ('pdf','course','template','audio','video','bundle','other')),
  price_label text check (char_length(price_label) <= 40),
  -- The seller's OWN Stripe Payment Link. We never hold the seller's Stripe keys.
  payment_link text check (payment_link is null or payment_link ~ '^https://(buy\.stripe\.com|checkout\.stripe\.com)/[A-Za-z0-9/_?=&%.-]{1,300}$'),
  -- Secret for the Payment Link's after-payment redirect (/s/<slug>/<product>/thanks?k=<redirect_key>). Rotatable.
  redirect_key uuid not null default gen_random_uuid(),
  -- Optional code the seller shows on Stripe's confirmation page or receipt. Stored as sha256 hex only.
  access_code_hash text check (access_code_hash is null or access_code_hash ~ '^[0-9a-f]{64}$'),
  max_downloads integer not null default 5 check (max_downloads between 1 and 50),
  link_days integer not null default 7 check (link_days between 1 and 90),
  published boolean not null default false,
  sort integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists dl_products_user_idx on public.dl_products (user_id, sort, created_at desc);

create table if not exists public.dl_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.dl_products(id) on delete cascade,
  path text not null unique check (char_length(path) <= 500),
  name text not null check (char_length(name) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  mime text not null check (char_length(mime) <= 100),
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  -- The object must sit in the owner's own folder: "<user_id>/<product_id>/...".
  check (split_part(path, '/', 1) = user_id::text and split_part(path, '/', 2) = product_id::text)
);
create index if not exists dl_files_product_idx on public.dl_files (product_id, created_at);

-- One row per claimed purchase (redirect key or access code). The token is the buyer's private download link.
create table if not exists public.dl_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.dl_products(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  via text not null check (via in ('redirect','code')),
  buyer_email text check (buyer_email is null or (buyer_email = lower(btrim(buyer_email)) and char_length(buyer_email) between 3 and 320)),
  downloads integer not null default 0,
  max_downloads integer not null check (max_downloads between 1 and 50),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dl_orders_user_idx on public.dl_orders (user_id, created_at desc);
create index if not exists dl_orders_product_idx on public.dl_orders (product_id, created_at desc);

alter table public.dl_stores enable row level security;
alter table public.dl_products enable row level security;
alter table public.dl_files enable row level security;
alter table public.dl_orders enable row level security;

create policy dl_stores_select_own on public.dl_stores for select to authenticated using (user_id = auth.uid());
create policy dl_stores_insert_own on public.dl_stores for insert to authenticated with check (user_id = auth.uid() and public.dl_has_access(auth.uid()));
create policy dl_stores_update_own on public.dl_stores for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.dl_has_access(auth.uid()));

create policy dl_products_select_own on public.dl_products for select to authenticated using (user_id = auth.uid());
create policy dl_products_insert_own on public.dl_products for insert to authenticated with check (user_id = auth.uid() and public.dl_has_access(auth.uid()));
create policy dl_products_update_own on public.dl_products for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.dl_has_access(auth.uid()));
create policy dl_products_delete_own on public.dl_products for delete to authenticated using (user_id = auth.uid());

-- A file row can only point at the seller's own product.
create policy dl_files_select_own on public.dl_files for select to authenticated using (user_id = auth.uid());
create policy dl_files_insert_own on public.dl_files for insert to authenticated with check (user_id = auth.uid() and public.dl_has_access(auth.uid())
  and exists (select 1 from public.dl_products p where p.id = product_id and p.user_id = auth.uid()));
create policy dl_files_delete_own on public.dl_files for delete to authenticated using (user_id = auth.uid());

-- Orders are created only by the server; the seller can read and revoke their own.
create policy dl_orders_select_own on public.dl_orders for select to authenticated using (user_id = auth.uid());
create policy dl_orders_update_own on public.dl_orders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.dl_stores, public.dl_products, public.dl_files, public.dl_orders from anon;
revoke all on public.dl_stores, public.dl_products, public.dl_files, public.dl_orders from authenticated;
grant select, insert, update on public.dl_stores to authenticated;
grant select, delete on public.dl_products to authenticated;
-- download_count is server-maintained; the owner can't fake it.
grant insert (user_id, slug, title, subtitle, description, kind, price_label, payment_link, access_code_hash, max_downloads, link_days, published, sort) on public.dl_products to authenticated;
grant update (slug, title, subtitle, description, kind, price_label, payment_link, redirect_key, access_code_hash, max_downloads, link_days, published, sort, updated_at) on public.dl_products to authenticated;
grant select, delete on public.dl_files to authenticated;
grant insert (user_id, product_id, path, name, size_bytes, mime) on public.dl_files to authenticated;
-- The buyer's token is never readable by the seller's session (the seller can't impersonate a buyer link by accident).
grant select (id, user_id, product_id, via, buyer_email, downloads, max_downloads, expires_at, revoked, emailed_at, created_at) on public.dl_orders to authenticated;
grant update (revoked) on public.dl_orders to authenticated;

-- Atomic download counter used by the server (service role) when it issues a signed URL.
create or replace function public.dl_take_download(order_token uuid, file uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o public.dl_orders; f public.dl_files;
begin
  select * into o from public.dl_orders where token = order_token for update;
  if not found or o.revoked or o.expires_at < now() or o.downloads >= o.max_downloads then return null; end if;
  select * into f from public.dl_files where id = file and product_id = o.product_id;
  if not found then return null; end if;
  update public.dl_orders set downloads = downloads + 1 where id = o.id;
  update public.dl_files set download_count = download_count + 1 where id = f.id;
  update public.dl_products set download_count = download_count + 1 where id = o.product_id;
  return f.path;
end $$;
revoke all on function public.dl_take_download(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dl_take_download(uuid, uuid) to service_role;

-- PRIVATE bucket: 50 MB per file, fixed file types. No anon policies at all, so the public can't list or read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dl-files', 'dl-files', false, 52428800, array['application/pdf','application/zip','application/x-zip-compressed','application/epub+zip',
  'audio/mpeg','audio/mp4','video/mp4','image/png','image/jpeg','image/webp','text/plain','text/csv','text/markdown'])
on conflict (id) do nothing;

create policy dl_files_obj_select_own on storage.objects for select to authenticated
  using (bucket_id = 'dl-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy dl_files_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'dl-files' and (storage.foldername(name))[1] = auth.uid()::text and public.dl_has_access(auth.uid()));
create policy dl_files_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'dl-files' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.feature_flags (key, enabled, description)
values ('downloads_public', false, 'Show Digital downloads on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
