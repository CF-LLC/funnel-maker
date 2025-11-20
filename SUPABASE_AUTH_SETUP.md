# Supabase Auth Configuration

## Fix Password Reset Redirects

You need to update your Supabase project's redirect URLs:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update the **Redirect URLs** section:

### For Development:
Add these URLs to the allowed list:
```
http://localhost:3000/auth/callback
http://localhost:3000/
```

### For Production:
Add these URLs to the allowed list:
```
https://myfunnelr.vercel.app/auth/callback
https://myfunnelr.vercel.app/
```

### Site URL
Set your **Site URL** to:
- Development: `http://localhost:3000`
- Production: `https://myfunnelr.vercel.app`

## What This Fixes

- Password reset emails will now redirect properly through `/auth/callback`
- Email confirmations will work correctly
- The middleware will catch any root redirects and forward them to the callback handler

## After Configuration

Once you've updated these settings in Supabase:
1. Request a new password reset email
2. Click the link in the email
3. You should be redirected to `/auth/update-password` properly

The middleware has been updated to automatically redirect any auth callbacks that land on the root URL to the proper `/auth/callback` route.
