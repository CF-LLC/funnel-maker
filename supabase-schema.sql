-- Run this in your Supabase SQL Editor
-- Safe to run multiple times - uses IF NOT EXISTS and DROP IF EXISTS
--
-- This script will:
-- 1. Create all tables if they don't exist
-- 2. Add new columns to existing funnels table (org_id, is_public)
-- 3. Enable Row Level Security
-- 4. Create/update all RLS policies

-- Create users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null
);

-- Create organizations table
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Create org_members table
create table if not exists org_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Create invitations table
create table if not exists invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  role text default 'member' check (role in ('admin', 'member')),
  invited_by uuid references users(id),
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Add new columns to existing funnels table if they don't exist
do $$
begin
  -- Create funnels table if it doesn't exist
  create table if not exists funnels (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references users(id) on delete cascade,
    name text not null,
    steps jsonb default '[]'::jsonb,
    created_at timestamptz default now()
  );
  
  -- Add org_id column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'funnels' and column_name = 'org_id') then
    alter table funnels add column org_id uuid references organizations(id) on delete cascade;
  end if;
  
  -- Add is_public column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'funnels' and column_name = 'is_public') then
    alter table funnels add column is_public boolean default false;
  end if;
  
  -- Add slug column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'funnels' and column_name = 'slug') then
    alter table funnels add column slug text unique;
  end if;
end $$;

-- Create analytics table
create table if not exists analytics (
  id uuid primary key default uuid_generate_v4(),
  funnel_id uuid references funnels(id) on delete cascade,
  data jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table users enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table invitations enable row level security;
alter table funnels enable row level security;
alter table analytics enable row level security;

-- RLS Policies for users
drop policy if exists "Users can read own data" on users;
create policy "Users can read own data"
  on users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own data" on users;
create policy "Users can update own data"
  on users for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own data" on users;
create policy "Users can insert own data"
  on users for insert
  with check (auth.uid() = id);

-- RLS Policies for organizations
drop policy if exists "Users can read orgs they belong to" on organizations;
create policy "Users can read orgs they belong to"
  on organizations for select
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from org_members
      where org_members.org_id = organizations.id
      and org_members.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can update their orgs" on organizations;
create policy "Owners can update their orgs"
  on organizations for update
  using (owner_id = auth.uid());

drop policy if exists "Users can create organizations" on organizations;
create policy "Users can create organizations"
  on organizations for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete their orgs" on organizations;
create policy "Owners can delete their orgs"
  on organizations for delete
  using (owner_id = auth.uid());

-- RLS Policies for org_members
drop policy if exists "Users can read org members of their orgs" on org_members;
create policy "Users can read org members of their orgs"
  on org_members for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from organizations
      where organizations.id = org_members.org_id
      and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners and admins can add members" on org_members;
create policy "Owners and admins can add members"
  on org_members for insert
  with check (
    exists (
      select 1 from organizations
      where organizations.id = org_members.org_id
      and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners and admins can remove members" on org_members;
create policy "Owners and admins can remove members"
  on org_members for delete
  using (
    exists (
      select 1 from organizations
      where organizations.id = org_members.org_id
      and organizations.owner_id = auth.uid()
    )
  );

-- RLS Policies for invitations
drop policy if exists "Users can read invitations for their orgs" on invitations;
create policy "Users can read invitations for their orgs"
  on invitations for select
  using (
    email = (select email from users where id = auth.uid()) or
    exists (
      select 1 from organizations
      where organizations.id = invitations.org_id
      and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners and admins can create invitations" on invitations;
create policy "Owners and admins can create invitations"
  on invitations for insert
  with check (
    exists (
      select 1 from organizations
      where organizations.id = invitations.org_id
      and organizations.owner_id = auth.uid()
    )
  );

-- RLS Policies for funnels
drop policy if exists "Users can read own funnels" on funnels;
create policy "Users can read own funnels"
  on funnels for select
  using (
    auth.uid() = user_id or
    is_public = true
  );

drop policy if exists "Users can insert own funnels" on funnels;
create policy "Users can insert own funnels"
  on funnels for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own funnels or org funnels" on funnels;
create policy "Users can update own funnels or org funnels"
  on funnels for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own funnels" on funnels;
create policy "Users can delete own funnels"
  on funnels for delete
  using (auth.uid() = user_id);

-- RLS Policies for analytics
drop policy if exists "Users can read own funnel analytics" on analytics;
create policy "Users can read own funnel analytics"
  on analytics for select
  using (
    exists (
      select 1 from funnels
      where funnels.id = analytics.funnel_id
      and funnels.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analytics for own funnels" on analytics;
create policy "Users can insert analytics for own funnels"
  on analytics for insert
  with check (
    exists (
      select 1 from funnels
      where funnels.id = analytics.funnel_id
      and funnels.user_id = auth.uid()
    )
  );

-- Create subscriptions table
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_type text not null check (plan_type in ('free', 'starter', 'pro', 'enterprise')),
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for subscriptions
alter table subscriptions enable row level security;

-- RLS Policies for subscriptions
drop policy if exists "Users can read own subscription" on subscriptions;
create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own subscription" on subscriptions;
create policy "Users can update own subscription"
  on subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own subscription" on subscriptions;
create policy "Users can insert own subscription"
  on subscriptions for insert
  with check (auth.uid() = user_id);

-- Create admin users table
create table if not exists admin_users (
  id uuid primary key references users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS for admin_users
alter table admin_users enable row level security;

-- RLS Policies for admin_users
drop policy if exists "Admins can read admin list" on admin_users;
create policy "Admins can read admin list"
  on admin_users for select
  using (
    exists (
      select 1 from admin_users
      where admin_users.id = auth.uid()
    )
  );

-- Insert admin user (will create after user signs up)
-- Run this manually after your account is created:
-- insert into admin_users (id, email)
-- select id, email from users where email = 'cooperfeatherstone13@gmail.com'
-- on conflict (email) do nothing;

-- Create function to prevent duplicate email signups
create or replace function check_email_uniqueness()
returns trigger as $$
begin
  if exists (
    select 1 from auth.users
    where email = new.email
    and id != new.id
  ) then
    raise exception 'An account with this email already exists';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to enforce email uniqueness
drop trigger if exists enforce_email_uniqueness on auth.users;
create trigger enforce_email_uniqueness
  before insert or update on auth.users
  for each row
  execute function check_email_uniqueness();

