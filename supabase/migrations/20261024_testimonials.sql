-- Tool #6: Testimonials. Additive only. Backup: /workspace/backups/funnel-maker-20261024-testimonials
alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'testimonials', 'all'));

-- Paid tool: a testimonials row or All Access only (no early-user grant).
create or replace function public.tst_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('testimonials', 'all') and active) $$;
revoke all on function public.tst_has_access(uuid) from public, anon;
grant execute on function public.tst_has_access(uuid) to authenticated, service_role;

-- Reviews are written only by the server (service role) from the public /@handle/review page.
create table public.tst_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  role text check (role is null or char_length(role) <= 100),
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  photo_path text check (photo_path is null or (char_length(photo_path) <= 300 and photo_path not like '%..%')),
  -- pending: new, private. approved: public. hidden: owner hid it (never deleted).
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tst_reviews_user_idx on public.tst_reviews(user_id, created_at desc);
create index tst_reviews_approved_idx on public.tst_reviews(user_id, approved_at desc) where status = 'approved';

-- Owners may only change status; content is the client's words.
create or replace function public.tst_review_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then new.approved_at := now(); end if;
  if new.status <> 'approved' then new.approved_at := null; end if;
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then raise exception 'review_server_only' using errcode = '42501'; end if;
  if (to_jsonb(new) - 'status' - 'updated_at' - 'approved_at') <> (to_jsonb(old) - 'status' - 'updated_at' - 'approved_at') then
    raise exception 'review_content_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.tst_review_rules() from public, anon, authenticated;
create trigger tst_review_rules before insert or update on public.tst_reviews
  for each row execute function public.tst_review_rules();

-- Per-account settings: whether the review link takes submissions, and where approved reviews are embedded.
create table public.tst_settings (
  user_id uuid primary key default auth.uid() references public.users(id) on delete cascade,
  accepting boolean not null default true,
  linkinbio_layout text not null default 'none' check (linkinbio_layout in ('none', 'grid', 'quote')),
  proposals_layout text not null default 'none' check (proposals_layout in ('none', 'grid', 'quote')),
  updated_at timestamptz not null default now()
);

alter table public.tst_reviews enable row level security;
alter table public.tst_settings enable row level security;
revoke all on public.tst_reviews from anon;
revoke all on public.tst_settings from anon;
create policy tst_reviews_select_own on public.tst_reviews for select to authenticated using (user_id = auth.uid());
create policy tst_reviews_update_own on public.tst_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tst_has_access(auth.uid()));
create policy tst_settings_select_own on public.tst_settings for select to authenticated using (user_id = auth.uid());
create policy tst_settings_insert_own on public.tst_settings for insert to authenticated with check (user_id = auth.uid() and public.tst_has_access(auth.uid()));
create policy tst_settings_update_own on public.tst_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tst_has_access(auth.uid()));
-- No delete policies: reviews are hidden, never deleted.

-- Private photo bucket: 2 MB, jpeg/png/webp. Only the server writes; photos are served via short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tst-photos', 'tst-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
