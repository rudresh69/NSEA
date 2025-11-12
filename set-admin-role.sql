-- Set admin@local.dev as admin
-- Run this in Supabase SQL Editor

-- Update the user's role to admin
UPDATE user_profiles
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'admin@local.dev';

-- Verify the update
SELECT id, email, name, role, created_at, updated_at
FROM user_profiles
WHERE email = 'admin@local.dev';

-- If the user doesn't exist, you may need to create them first
-- Check if they exist in auth.users:
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@local.dev';

