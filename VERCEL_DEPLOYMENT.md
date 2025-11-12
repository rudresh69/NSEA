# Vercel Deployment Guide

This guide will help you deploy the Neuro Smart Emission Assistant to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A Supabase project with database migrations applied
3. All required environment variables configured

## Step 1: Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

## Step 2: Configure Environment Variables

Before deploying, you need to set up the following environment variables in Vercel:

### Required Environment Variables

1. **Database Configuration**
   - `DATABASE_URL` - Your Supabase PostgreSQL connection string
   - `SUPABASE_DATABASE_URL` - Alternative database URL (can be same as DATABASE_URL)

2. **Supabase Configuration**
   - `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

3. **Authentication Configuration**
   - `JWT_SECRET` - Secret key for JWT token signing
   - `ADMIN_EMAIL` - Email for the admin user (default: `admin@local.dev`)
   - `ADMIN_PASSWORD` - Password for the admin user (default: `admin123`)

4. **Optional Configuration**
   - `FORGE_API_URL` - Forge API URL (if using Forge services)
   - `FORGE_API_KEY` - Forge API key (if using Forge services)
   - `OAUTH_SERVER_URL` - OAuth server URL (if using OAuth)
   - `APP_ID` - Application ID (if using OAuth)
   - `NODE_ENV` - Set to `production` for production deployments

### Setting Environment Variables in Vercel

#### Via Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable for the appropriate environments (Production, Preview, Development)

#### Via Vercel CLI:
```bash
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD
# ... add other variables as needed
```

## Step 3: Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `pnpm install`
4. Add all environment variables
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy (first time will ask for configuration)
vercel

# Deploy to production
vercel --prod
```

## Step 4: Verify Deployment

After deployment, verify the following:

1. **Frontend is accessible**: Visit your Vercel deployment URL
2. **API routes work**: Test `/api/trpc` endpoints
3. **Authentication works**: Test login/register endpoints
4. **Database connection**: Verify database queries work

## Step 5: Initialize Admin User

After deployment, you can initialize the admin user by:

1. **Via API endpoint** (if enabled):
   ```bash
   curl -X POST https://your-app.vercel.app/api/auth/init-admin
   ```

2. **Via Supabase Dashboard**:
   - Go to Authentication > Users
   - Create a new user with the admin email
   - Set the role to "admin" in the user_profiles table

## Project Structure for Vercel

```
├── api/                    # Vercel serverless functions
│   ├── trpc/
│   │   └── [...path].ts   # tRPC API handler
│   └── auth/
│       ├── login.ts        # Login endpoint
│       ├── register.ts     # Register endpoint
│       └── init-admin.ts  # Admin initialization
├── client/                 # React frontend
├── server/                 # Server code (shared with API functions)
├── shared/                 # Shared types and constants
├── vercel.json            # Vercel configuration
└── .vercelignore          # Files to ignore during deployment
```

## Build Process

Vercel will automatically:
1. Run `pnpm install` to install dependencies
2. Run `pnpm build` to build the frontend (outputs to `dist/public`)
3. Deploy serverless functions from the `api/` directory
4. Serve static files from `dist/public`

## API Routes

The following API routes are available:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/init-admin` - Initialize admin user
- `/api/trpc/*` - All tRPC endpoints (handled by catch-all route)

## Troubleshooting

### Build Failures

1. **Check Node.js version**: Vercel uses Node.js 20.x by default. If you need a different version, add a `.nvmrc` file.

2. **Check build logs**: Review the build logs in Vercel dashboard for specific errors.

3. **Verify dependencies**: Ensure all dependencies are listed in `package.json`.

### Runtime Errors

1. **Check environment variables**: Ensure all required environment variables are set.

2. **Check database connection**: Verify `DATABASE_URL` is correct and accessible from Vercel.

3. **Check Supabase configuration**: Verify Supabase URL and keys are correct.

4. **Check function logs**: Review function logs in Vercel dashboard for runtime errors.

### CORS Issues

CORS is configured in `vercel.json`. If you encounter CORS issues:
1. Verify the `headers` configuration in `vercel.json`
2. Check that your frontend is making requests to the correct domain

### Cookie Issues

If cookies aren't working:
1. Ensure `secure` flag is set correctly (should be `true` in production)
2. Check `sameSite` settings
3. Verify domain settings match your Vercel deployment domain

## Performance Optimization

1. **Function Timeout**: API functions have a 30-second timeout (configured in `vercel.json`)

2. **Cold Starts**: First request to a serverless function may be slower due to cold starts. Consider:
   - Using Vercel Pro plan for better performance
   - Implementing connection pooling for database connections
   - Using edge functions for simple operations

3. **Static Assets**: Static assets are served from Vercel's CDN automatically.

## Database Migrations

Database migrations should be run manually in Supabase:
1. Go to Supabase Dashboard > SQL Editor
2. Run the migration SQL from `supabase-migration.sql`
3. Verify tables are created correctly

## Monitoring

1. **Vercel Analytics**: Enable in project settings for performance monitoring
2. **Function Logs**: Check Vercel dashboard > Functions for runtime logs
3. **Error Tracking**: Consider integrating error tracking (e.g., Sentry)

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to Git
2. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secure - it has admin access
3. **JWT Secret**: Use a strong, random `JWT_SECRET`
4. **HTTPS**: Vercel automatically provides HTTPS for all deployments

## Custom Domain

To use a custom domain:
1. Go to Vercel project settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificates are automatically provisioned

## Support

For issues specific to:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **tRPC**: Check [tRPC Documentation](https://trpc.io/docs)

