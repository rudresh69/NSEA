# Vercel Deployment Checklist

Use this checklist to ensure your deployment is properly configured.

## Pre-Deployment

- [ ] All environment variables are documented in `VERCEL_DEPLOYMENT.md`
- [ ] Database migrations have been run in Supabase
- [ ] Supabase project is configured and accessible
- [ ] All required environment variables are ready to be added to Vercel

## Environment Variables to Set

### Required
- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `JWT_SECRET` - Secret for JWT token signing
- [ ] `ADMIN_EMAIL` - Admin user email
- [ ] `ADMIN_PASSWORD` - Admin user password

### Optional
- [ ] `FORGE_API_URL` - If using Forge services
- [ ] `FORGE_API_KEY` - If using Forge services
- [ ] `OAUTH_SERVER_URL` - If using OAuth
- [ ] `APP_ID` - If using OAuth
- [ ] `NODE_ENV` - Set to `production`

## Files Created/Modified

- [x] `vercel.json` - Vercel configuration
- [x] `api/trpc/[...path].ts` - tRPC API handler
- [x] `api/auth/login.ts` - Login endpoint
- [x] `api/auth/register.ts` - Registration endpoint
- [x] `api/auth/init-admin.ts` - Admin initialization
- [x] `.vercelignore` - Files to exclude from deployment
- [x] `package.json` - Updated with @vercel/node dependency and build script
- [x] `VERCEL_DEPLOYMENT.md` - Complete deployment guide

## Post-Deployment

- [ ] Verify frontend is accessible
- [ ] Test login functionality
- [ ] Test registration functionality
- [ ] Test tRPC API endpoints
- [ ] Verify database connections work
- [ ] Initialize admin user (if needed)
- [ ] Test authentication flow
- [ ] Check function logs for errors
- [ ] Verify CORS is working correctly
- [ ] Test cookie handling

## Troubleshooting

If you encounter issues:

1. **Check Build Logs**: Review build logs in Vercel dashboard
2. **Check Function Logs**: Review runtime logs for API functions
3. **Verify Environment Variables**: Ensure all variables are set correctly
4. **Check Database Connection**: Verify DATABASE_URL is correct
5. **Check Supabase Configuration**: Verify Supabase URL and keys
6. **Review Error Messages**: Check specific error messages in logs

## Testing Commands

After deployment, test these endpoints:

```bash
# Test tRPC endpoint
curl https://your-app.vercel.app/api/trpc/auth.me

# Test login (replace with actual credentials)
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test registration
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User"}'
```

