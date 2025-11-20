# Database Setup Instructions

## IMPORTANT: Run these steps in your Supabase SQL Editor

### Step 1: Run the main schema
Copy and paste the entire contents of `supabase-schema.sql` into your Supabase SQL Editor and run it.

### Step 2: Set up automatic user creation (CRITICAL)
Copy and paste the entire contents of `supabase/migrations/auto-create-user.sql` into your Supabase SQL Editor and run it.

This will create triggers that automatically:
- Create a user record in `public.users` when someone signs up
- Create a free subscription for new users
- Update user email if it changes in auth

### Step 3: Verify the setup
Run this query to check if the triggers were created:

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('on_auth_user_created', 'on_auth_user_updated');
```

You should see 2 triggers listed.

### Step 4: Test user creation
1. Try creating a new account on your app
2. Check if a record appears in both tables:
   - `auth.users` (Supabase Auth)
   - `public.users` (Your app's user table)
   - `public.subscriptions` (With plan_type = 'free')

### Troubleshooting

**If users are created in auth.users but not public.users:**
1. Make sure you ran the auto-create-user.sql migration
2. Check trigger permissions with:
```sql
SELECT * FROM pg_trigger WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');
```

**To manually fix existing users:**
```sql
-- Insert missing users from auth into public.users
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Create missing subscriptions
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, 'free', 'active' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;
```

### Step 5: Add yourself as admin
Replace with your actual email:

```sql
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM public.users 
WHERE email = 'cooperfeatherstone13@gmail.com'
ON CONFLICT (id) DO NOTHING;
```

## Mobile Auth Issues

If you're having trouble signing in from mobile:
1. Make sure `NEXT_PUBLIC_APP_URL` is set in your Vercel environment variables
2. In Supabase Dashboard → Authentication → URL Configuration, add your production URL to:
   - Site URL: `https://myfunnelr.vercel.app`
   - Redirect URLs: `https://myfunnelr.vercel.app/**`

## Navigation Issues

If the navbar doesn't show after login:
1. Clear your browser cache
2. Check browser console for errors
3. Make sure you're redirected to `/dashboard` after login
4. The dashboard layout should wrap the page with sidebar navigation
