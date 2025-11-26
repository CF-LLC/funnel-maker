-- COMPLETE RLS POLICY RESET AND FIX
-- This restores all base policies AND adds admin access
-- Run this in Supabase SQL Editor to fix all access issues

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- Users can read their own data
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own data
DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (true); -- Allow all inserts (for triggers)

-- Admins can view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ==========================================
-- FUNNELS TABLE POLICIES
-- ==========================================

-- Users can read their own funnels or public ones
DROP POLICY IF EXISTS "Users can read own funnels" ON funnels;
CREATE POLICY "Users can read own funnels"
  ON funnels FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_public = true
  );

-- Users can insert their own funnels
DROP POLICY IF EXISTS "Users can insert own funnels" ON funnels;
CREATE POLICY "Users can insert own funnels"
  ON funnels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own funnels
DROP POLICY IF EXISTS "Users can update own funnels or org funnels" ON funnels;
CREATE POLICY "Users can update own funnels or org funnels"
  ON funnels FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own funnels
DROP POLICY IF EXISTS "Users can delete own funnels" ON funnels;
CREATE POLICY "Users can delete own funnels"
  ON funnels FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all funnels
DROP POLICY IF EXISTS "Admins can view all funnels" ON funnels;
CREATE POLICY "Admins can view all funnels"
  ON funnels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ==========================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ==========================================

-- Users can read their own subscription
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscription
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (true); -- Allow all inserts (for triggers and webhooks)

-- Users can update their own subscription
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service can update subscriptions (for Stripe webhooks)
DROP POLICY IF EXISTS "Service can update subscriptions" ON subscriptions;
CREATE POLICY "Service can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (true); -- Allow all updates (for webhooks)

-- Admins can view all subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ==========================================
-- ORGANIZATIONS TABLE POLICIES
-- ==========================================

-- Users can read orgs they belong to
DROP POLICY IF EXISTS "Users can read orgs they belong to" ON organizations;
CREATE POLICY "Users can read orgs they belong to"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
    )
  );

-- Users can create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their organizations
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Owners can delete their organizations
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (auth.uid() = owner_id);

-- Admins can view all organizations
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ==========================================
-- ORG_MEMBERS TABLE POLICIES
-- ==========================================

-- Users can read org members for orgs they belong to
DROP POLICY IF EXISTS "Users can read org members" ON org_members;
CREATE POLICY "Users can read org members"
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = org_members.org_id
      AND (organizations.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM org_members om
             WHERE om.org_id = organizations.id
             AND om.user_id = auth.uid()
           ))
    )
  );

-- Admins can view all org members
DROP POLICY IF EXISTS "Admins can view all org_members" ON org_members;
CREATE POLICY "Admins can view all org_members"
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ==========================================
-- ANALYTICS TABLE POLICIES
-- ==========================================

-- Users can read analytics for their own funnels
DROP POLICY IF EXISTS "Users can read own funnel analytics" ON analytics;
CREATE POLICY "Users can read own funnel analytics"
  ON analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = analytics.funnel_id
      AND funnels.user_id = auth.uid()
    )
  );

-- Admins can view all analytics
DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics;
CREATE POLICY "Admins can view all analytics"
  ON analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
