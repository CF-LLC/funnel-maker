-- DIAGNOSTIC QUERIES
-- Run these one by one in Supabase SQL Editor to diagnose the issue

-- 1. Check if you have any users in the database
SELECT count(*) as user_count FROM users;

-- 2. Check if you have any funnels in the database
SELECT count(*) as funnel_count FROM funnels;

-- 3. Check current user ID (must be logged in)
SELECT auth.uid() as current_user_id;

-- 3b. Check if auth.uid() is NULL
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NOT LOGGED IN - SQL Editor runs as postgres superuser'
    ELSE 'Logged in as user'
  END as auth_status;

-- 4. Check if current user exists in users table
SELECT * FROM users WHERE id = auth.uid();

-- 5. Check if current user is an admin
SELECT * FROM admin_users WHERE id = auth.uid();

-- 5b. Check admin_users policies
SELECT * FROM pg_policies WHERE tablename = 'admin_users';

-- 5c. Try direct query bypassing RLS (as superuser this should work)
SELECT * FROM admin_users;

-- 6. List all RLS policies on users table
SELECT * FROM pg_policies WHERE tablename = 'users';

-- 7. List all RLS policies on funnels table
SELECT * FROM pg_policies WHERE tablename = 'funnels';

-- 8. Check if RLS is enabled on tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'funnels', 'subscriptions', 'organizations');

-- 9. Try to select funnels (should work with proper policies)
SELECT id, name, user_id, created_at FROM funnels LIMIT 5;

-- 10. Try to select users (should work with proper policies)
SELECT id, email FROM users LIMIT 5;

-- 11. Check funnels for current user
SELECT id, name, is_public FROM funnels WHERE user_id = auth.uid();
