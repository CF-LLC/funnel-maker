-- Tool #4: Forms. Backup: /workspace/backups/funnel-maker-20261024-063553-prForms
alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'forms', 'all'));

create or replace function public.frm_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('forms', 'all') and active) $$;

create table public.frm_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  submit_label text not null default 'Send' check (char_length(submit_label) between 1 and 40),
  -- [{id, type, label, required, options?}] validated in app (lib/forms/core.ts); max 10 fields
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 10),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.frm_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.frm_forms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 20000),
  created_at timestamptz not null default now()
);
create index frm_responses_form_created on public.frm_responses(form_id, created_at desc);

alter table public.frm_forms enable row level security;
alter table public.frm_responses enable row level security;
-- Owner-only. Public form page + submit are served by the server (service role).
create policy frm_forms_owner_select on public.frm_forms for select to authenticated using (user_id = auth.uid());
create policy frm_forms_owner_insert on public.frm_forms for insert to authenticated with check (user_id = auth.uid() and public.frm_has_access(auth.uid()));
create policy frm_forms_owner_update on public.frm_forms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.frm_has_access(auth.uid()));
create policy frm_responses_owner_select on public.frm_responses for select to authenticated using (user_id = auth.uid());
-- Responses are inserted only by the server; owner response.user_id must match the form owner.
create or replace function public.frm_responses_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select user_id into new.user_id from public.frm_forms where id = new.form_id;
  return new;
end $$;
create trigger frm_responses_owner before insert on public.frm_responses for each row execute function public.frm_responses_owner();
