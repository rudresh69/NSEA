# Quick Fix: Table Not Found Error

If you're seeing the error: `Could not find the table 'public.user_profiles' in the schema cache`

## Solution Steps:

### Step 1: Run the Migration SQL

1. Go to your Supabase project: https://supabase.com/dashboard/project/nblegrzglewrpwqogkgr
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy **ALL** the contents from `supabase-migration.sql` file
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Step 2: Verify Tables Were Created

1. In Supabase dashboard, go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `user_profiles`
   - `vehicles`
   - `emission_readings`
   - `alerts`

If you don't see them, the migration didn't run successfully. Check the SQL Editor for any error messages.

### Step 3: Refresh Schema Cache (if still having issues)

If you still get the error after running the migration:

1. Go to **Settings** → **API** in Supabase dashboard
2. Scroll down to find **"Reload Schema"** or **"Refresh Schema"** button
3. Click it to refresh PostgREST's schema cache

Alternatively, you can run this SQL command:
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 4: Restart Your Dev Server

After running the migration:
1. Stop your dev server (Ctrl+C)
2. Start it again: `pnpm dev`

### Troubleshooting

**If migration fails with "type already exists" error:**
- The migration now includes `DROP TYPE IF EXISTS` statements, so this should be handled
- If you still see this, manually drop the enum: `DROP TYPE IF EXISTS user_role CASCADE;`

**If you see permission errors:**
- Make sure you're running the SQL as a database admin (which you are by default in Supabase SQL Editor)
- The migration includes GRANT statements to fix permissions

**If tables exist but still getting cache error:**
- The migration includes `NOTIFY pgrst, 'reload schema';` at the end
- You can also manually refresh: Go to Settings → API → Reload Schema

### Verify It's Working

After completing the steps above, try:
1. Register a new user at `/register`
2. Login at `/login`
3. Check the server console - you should no longer see the "table not found" error

If you're still having issues, check:
- The Supabase project URL and keys are correct in your `.env` file
- You're using the correct Supabase project (the one with URL: `nblegrzglewrpwqogkgr.supabase.co`)

