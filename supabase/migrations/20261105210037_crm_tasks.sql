-- Private manual tasks for the signed-in Clients user. Additive table only.
-- Does not change crm_contacts, portal tasks, or time entries.
-- Unit tests that read this file are not live Postgres RLS proof.

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_tasks_user_idx on public.crm_tasks (user_id, done_at, due_on);

alter table public.crm_tasks enable row level security;

create policy crm_tasks_select_own on public.crm_tasks
  for select to authenticated using (user_id = auth.uid());
create policy crm_tasks_insert_own on public.crm_tasks
  for insert to authenticated with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));
create policy crm_tasks_update_own on public.crm_tasks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.crm_has_access(auth.uid()));

revoke all on table public.crm_tasks from public;
revoke all on table public.crm_tasks from anon;
revoke all on table public.crm_tasks from authenticated;
grant select, insert, update on table public.crm_tasks to authenticated;

-- Ordinary rollback is an application/image rollback only. Keep this table and its rows.
-- The previous app does not read crm_tasks, so the rows sit unused until this build returns.
-- Do not drop the table or delete its rows as a rollback. That would lose user data and is not authorized.
