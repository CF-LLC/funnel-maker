-- Rollback script to remove admin policies if they're causing issues
-- Run this ONLY if you're having login/data access issues after running admin-rls-policies.sql

DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view all funnels" ON funnels;
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all org_members" ON org_members;
DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics;
