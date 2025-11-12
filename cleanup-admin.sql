-- Cleanup script: Remove existing admin user if needed
-- Run this ONLY if you're getting duplicate key errors

-- Delete admin profile if it exists
DELETE FROM user_profiles WHERE email = 'admin@local.dev';

-- Note: The auth user will be recreated automatically on next server start
-- Or you can manually delete it from Authentication > Users in Supabase dashboard

