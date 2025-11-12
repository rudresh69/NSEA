# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for this project.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (this is already configured in the code)
   - **service_role key** (optional, for admin operations - keep this secret!)

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
SUPABASE_URL=https://nblegrzglewrpwqogkgr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note:** The service role key is optional but recommended for admin operations. If you don't have it, the code will use the anon key (which has limited permissions).

## Step 3: Set Up the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-migration.sql` file
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

This will create:
- `user_profiles` table (extends Supabase Auth users)
- `vehicles` table
- `emission_readings` table
- `alerts` table
- All necessary indexes and Row Level Security (RLS) policies
- A trigger to automatically create user profiles when users sign up

## Step 4: Configure Authentication Settings

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Make sure **Enable Email Signup** is enabled
3. Configure email templates if needed
4. (Optional) Set up email confirmation if you want to require email verification

## Step 5: Test the Setup

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. The server will automatically create an admin user on startup (if it doesn't exist):
   - Email: `admin@local.dev` (or the value from `ADMIN_EMAIL` env var)
   - Password: `admin123` (or the value from `ADMIN_PASSWORD` env var)

3. Try logging in at `http://localhost:3000/login`

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
- Make sure your Supabase project is active
- Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that the database schema has been created (run the migration SQL)

### Authentication Issues

If authentication isn't working:
- Check that Row Level Security (RLS) policies are set up correctly
- Verify that the `user_profiles` table exists and has the correct structure
- Check the browser console and server logs for error messages

### Service Role Key

If you need admin operations (like creating users programmatically), you'll need the service role key:
1. Go to **Settings** → **API** in Supabase
2. Copy the **service_role** key (keep this secret!)
3. Add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

## Next Steps

- The authentication system is now fully integrated with Supabase
- Users can register and login through the `/login` and `/register` pages
- All database operations now use Supabase instead of the local JSON file
- Protected routes require authentication
- Admin users can access admin-only features

## Security Notes

- Never commit your `.env` file to version control
- Keep your service role key secret - it has full database access
- The anon key is safe to use in client-side code
- Row Level Security (RLS) policies ensure users can only access their own data

