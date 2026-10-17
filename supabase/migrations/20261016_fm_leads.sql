-- funnel-maker v1: lead storage. Create-only and idempotent: no drops, no data changes.
-- Requires the base `funnels` table (supabase-schema.sql) with user_id, slug, is_public.

create table if not exists public.fm_leads (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  name text check (char_length(name) <= 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (char_length(phone) <= 50),
  message text check (char_length(message) <= 2000),
  template text check (char_length(template) <= 50),
  utm jsonb not null default '{}'::jsonb check (pg_column_size(utm) <= 2048),
  created_at timestamptz not null default now()
);

create index if not exists fm_leads_funnel_created_idx on public.fm_leads (funnel_id, created_at desc);

alter table public.fm_leads enable row level security;

-- Owners can read their own funnels' leads. No direct insert/update/delete policies:
-- public submissions go only through fm_submit_lead() below.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fm_leads' and policyname = 'fm_leads_owner_select') then
    create policy fm_leads_owner_select on public.fm_leads for select to authenticated
      using (exists (select 1 from public.funnels f where f.id = fm_leads.funnel_id and f.user_id = auth.uid()));
  end if;
end $$;

-- Public submit: only for published funnels, looked up by slug.
create or replace function public.fm_submit_lead(
  p_slug text, p_name text, p_email text, p_phone text, p_message text, p_template text, p_utm jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_funnel uuid;
  v_id uuid;
begin
  select id into v_funnel from public.funnels where slug = p_slug and is_public = true;
  if v_funnel is null then
    raise exception 'funnel_not_found' using errcode = 'P0002';
  end if;
  insert into public.fm_leads (funnel_id, name, email, phone, message, template, utm)
  values (v_funnel, nullif(p_name, ''), p_email, nullif(p_phone, ''), nullif(p_message, ''), nullif(p_template, ''), coalesce(p_utm, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.fm_submit_lead(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.fm_submit_lead(text, text, text, text, text, text, jsonb) to anon, authenticated;
