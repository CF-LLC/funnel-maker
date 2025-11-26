-- Add admin policies to allow admin users to view all data
-- These policies are IN ADDITION TO existing policies (not replacing them)
-- Admin users are defined in the admin_users table

-- Admin can view all users (in addition to users viewing their own data)
CREATE POLICY IF NOT EXISTS "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all funnels (in addition to existing funnel policies)
CREATE POLICY IF NOT EXISTS "Admins can view all funnels"
  ON funnels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all organizations (in addition to existing org policies)
CREATE POLICY IF NOT EXISTS "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all subscriptions (in addition to existing subscription policies)
CREATE POLICY IF NOT EXISTS "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all org_members (in addition to existing org member policies)
CREATE POLICY IF NOT EXISTS "Admins can view all org_members"
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin can view all analytics (in addition to existing analytics policies)
CREATE POLICY IF NOT EXISTS "Admins can view all analytics"
  ON analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
