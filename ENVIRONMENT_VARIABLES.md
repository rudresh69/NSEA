# Environment Variables Reference

This document lists all environment variables used in the Neuro Smart Emission Assistant project.

## Required Environment Variables

These variables are essential for the application to function properly.

### Database Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string for Supabase database | `""` (empty) | `postgresql://postgres:[password]@[host]:5432/postgres` |
| `SUPABASE_DATABASE_URL` | Alternative database URL (used by Drizzle ORM) | `""` (empty) | Same as `DATABASE_URL` |

**How to get:**
- Go to Supabase Dashboard → Settings → Database
- Copy the "Connection string" under "Connection pooling"
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### Supabase Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://nblegrzglewrpwqogkgr.supabase.co` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe to expose in client) | Hardcoded default (see code) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access - keep secret!) | `""` (empty) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**How to get:**
- Go to Supabase Dashboard → Settings → API
- Copy:
  - **Project URL** → `SUPABASE_URL`
  - **anon public** key → `SUPABASE_ANON_KEY`
  - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Authentication Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `JWT_SECRET` | Secret key for JWT token signing and cookie encryption | `"default-secret-key"` | `your-random-secret-key-here` |
| `ADMIN_EMAIL` | Email address for the admin user | `"admin@local.dev"` | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Password for the admin user | `"admin123"` | `your-secure-password` |

**Security Notes:**
- `JWT_SECRET`: Use a strong, random string (at least 32 characters). Generate with: `openssl rand -base64 32`
- `ADMIN_PASSWORD`: Use a strong password in production
- `SUPABASE_SERVICE_ROLE_KEY`: Never commit this to version control

## Optional Environment Variables

These variables are only needed if you're using specific features.

### Forge API Configuration

| Variable | Description | Default | When Needed |
|----------|-------------|---------|-------------|
| `FORGE_API_URL` | Forge API base URL | `""` (empty) | If using Forge services for storage or data API |
| `FORGE_API_KEY` | Forge API authentication key | `""` (empty) | If using Forge services |

**Note:** These are required if you're using the storage or data API features that depend on Forge services.

### OAuth Configuration

| Variable | Description | Default | When Needed |
|----------|-------------|---------|-------------|
| `OAUTH_SERVER_URL` | OAuth server base URL | `""` (empty) | If using OAuth authentication |
| `APP_ID` | Application ID for OAuth | `""` (empty) | If using OAuth authentication |

**Note:** These are only needed if you're implementing OAuth-based authentication.

### Runtime Configuration

| Variable | Description | Default | When Needed |
|----------|-------------|---------|-------------|
| `NODE_ENV` | Node.js environment | `"development"` | Set to `"production"` for production deployments |
| `PORT` | Server port (for local development) | `3000` | Only used in local Express server, not in Vercel |

## Environment Variables Summary

### For Vercel Deployment (Production)

**Minimum Required:**
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-random-secret-key-here
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
NODE_ENV=production
```

**If using Forge services:**
```env
FORGE_API_URL=https://api.forge.example.com
FORGE_API_KEY=your-forge-api-key
```

**If using OAuth:**
```env
OAUTH_SERVER_URL=https://oauth.example.com
APP_ID=your-app-id
```

### For Local Development

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
SUPABASE_DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# Supabase
SUPABASE_URL=https://nblegrzglewrpwqogkgr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=dev-secret-key-change-in-production
ADMIN_EMAIL=admin@local.dev
ADMIN_PASSWORD=admin123

# Optional
FORGE_API_URL=
FORGE_API_KEY=
OAUTH_SERVER_URL=
APP_ID=
NODE_ENV=development
```

## Setting Environment Variables in Vercel

### Via Vercel Dashboard

1. Go to your project: https://vercel.com/rudreshs-projects-58cde913/neuro-smart-emission-assistant
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select Production, Preview, and/or Development
4. Click **Save**
5. **Redeploy** your application for changes to take effect

### Via Vercel CLI

```bash
# Add environment variables
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD
vercel env add NODE_ENV

# Optional variables
vercel env add FORGE_API_URL
vercel env add FORGE_API_KEY
vercel env add OAUTH_SERVER_URL
vercel env add APP_ID

# List all environment variables
vercel env ls

# Remove an environment variable
vercel env rm VARIABLE_NAME
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for `JWT_SECRET` (generate with `openssl rand -base64 32`)
3. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - it has admin access to your database
4. **Use different values** for development and production
5. **Rotate secrets regularly** in production
6. **Use Vercel's environment variable encryption** - values are encrypted at rest

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` format is correct
- Check if your Supabase project allows connections from Vercel's IPs
- Ensure the database password is correct
- Try using connection pooling URL instead of direct connection

### Authentication Issues

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check if `SUPABASE_SERVICE_ROLE_KEY` is set (required for admin operations)
- Ensure `JWT_SECRET` is set and consistent across deployments

### Missing Environment Variables

- Check Vercel function logs for specific error messages
- Verify variables are set for the correct environment (Production/Preview/Development)
- Ensure you've redeployed after adding new variables

## Current Default Values

Based on your code, here are the current default values:

- `SUPABASE_URL`: `https://nblegrzglewrpwqogkgr.supabase.co`
- `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY`
- `ADMIN_EMAIL`: `admin@local.dev`
- `ADMIN_PASSWORD`: `admin123`
- `JWT_SECRET`: `default-secret-key` (⚠️ Change this in production!)

**⚠️ Important:** Change the default values, especially `JWT_SECRET` and `ADMIN_PASSWORD`, before deploying to production!

