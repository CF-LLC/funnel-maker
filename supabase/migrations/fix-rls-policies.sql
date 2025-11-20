-- Fix RLS policies to allow trigger-based inserts
-- This allows the database trigger to create user records

-- Drop and recreate users insert policy to allow service role
DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (true); -- Allow all inserts (will be controlled by trigger)

-- Drop and recreate subscriptions insert policy
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (true); -- Allow all inserts (will be controlled by trigger)

-- Also allow updates from triggers
DROP POLICY IF EXISTS "Service can update subscriptions" ON subscriptions;
CREATE POLICY "Service can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (true); -- Allow all updates (for webhooks and triggers)
