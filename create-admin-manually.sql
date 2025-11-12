-- Manual Admin User Creation Script
-- Run this in Supabase SQL Editor if the admin user doesn't exist

-- First, check if admin user exists in auth.users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@local.dev';

-- If the query returns no rows, the admin user doesn't exist in Supabase Auth
-- You need to create it through the Supabase dashboard or API

-- Option 1: Create via Supabase Dashboard
-- 1. Go to Authentication > Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter email: admin@local.dev
-- 4. Enter password: admin123 (or your ADMIN_PASSWORD)
-- 5. Make sure "Auto Confirm User" is checked
-- 6. Click "Create User"

-- Option 2: The server should create it automatically on startup
-- Make sure your SUPABASE_SERVICE_ROLE_KEY is set in .env file
-- Then restart the server

-- After creating the auth user, verify the profile exists:
SELECT * FROM user_profiles WHERE email = 'admin@local.dev';

-- If profile doesn't exist, it will be created automatically by the trigger
-- Or you can manually insert:
-- INSERT INTO user_profiles (id, email, name, role)
-- SELECT id, email, 'Administrator', 'admin'
-- FROM auth.users
-- WHERE email = 'admin@local.dev'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

