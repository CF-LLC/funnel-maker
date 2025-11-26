-- Add admin user to admin_users table
-- Replace the email and ID below with your actual values

-- First, get your user ID by running: SELECT id, email FROM users WHERE email = 'cooperfeatherstone13@gmail.com';
-- Then insert into admin_users

-- Option 1: If you know your user ID
-- INSERT INTO admin_users (id, email) 
-- VALUES ('your-user-id-here', 'cooperfeatherstone13@gmail.com');

-- Option 2: Insert using email lookup (easier)
INSERT INTO admin_users (id, email)
SELECT id, email FROM users WHERE email = 'cooperfeatherstone13@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Verify it worked
SELECT * FROM admin_users;
