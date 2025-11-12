-- Check if admin user exists in Supabase Auth
-- Run this in Supabase SQL Editor to verify the admin user

-- Check auth users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@local.dev';

-- Check user profiles
SELECT id, email, name, role, created_at 
FROM user_profiles 
WHERE email = 'admin@local.dev';

-- If the auth user doesn't exist, you can create it manually:
-- Go to Authentication > Users > Add User in Supabase dashboard
-- Or use the admin API (requires service role key)

