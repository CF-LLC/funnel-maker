-- Safe admin policies that ADD to existing policies without breaking them
-- Run this to allow admins to see all users and their funnels

-- First, let's make sure the existing policies stay intact and just ADD admin access

-- Admin can view all users (ADDS to existing "Users can read own data" policy)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all funnels (ADDS to existing funnel policies)
DROP POLICY IF EXISTS "Admins can view all funnels" ON funnels;
CREATE POLICY "Admins can view all funnels"
  ON funnels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all organizations (ADDS to existing org policies)
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all subscriptions (ADDS to existing subscription policies)
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all org_members (ADDS to existing org member policies)
DROP POLICY IF EXISTS "Admins can view all org_members" ON org_members;
CREATE POLICY "Admins can view all org_members"
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all analytics (ADDS to existing analytics policies)
DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics;
CREATE POLICY "Admins can view all analytics"
  ON analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
