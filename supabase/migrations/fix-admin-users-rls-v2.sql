-- Simple fix: Make admin_users readable by anyone
-- This is safe because it only contains IDs and emails (no sensitive data)
-- and admins are already listed in the code

-- Drop all existing policies on admin_users
DROP POLICY IF EXISTS "Admins can read admin list" ON admin_users;
DROP POLICY IF EXISTS "Users can check if they are admin" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all admins" ON admin_users;

-- Create a simple policy: anyone logged in can check the admin list
CREATE POLICY "Anyone can read admin list"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);
