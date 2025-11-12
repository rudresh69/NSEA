#!/bin/bash
# ============================================
# Vercel Environment Variables Import Script
# ============================================
# This script helps you add environment variables to Vercel
# Usage: bash vercel-env-import.sh
# ============================================

echo "============================================"
echo "Vercel Environment Variables Setup"
echo "============================================"
echo ""
echo "This script will help you add environment variables to Vercel."
echo "Make sure you have the Vercel CLI installed and are logged in."
echo ""
read -p "Press Enter to continue..."

# Required variables
echo ""
echo "Adding REQUIRED environment variables..."
echo ""

echo "1. DATABASE_URL"
echo "   Get from: Supabase Dashboard → Settings → Database → Connection string"
read -p "   Enter DATABASE_URL: " DATABASE_URL
vercel env add DATABASE_URL production <<< "$DATABASE_URL"

echo ""
echo "2. SUPABASE_DATABASE_URL (can be same as DATABASE_URL)"
read -p "   Enter SUPABASE_DATABASE_URL: " SUPABASE_DATABASE_URL
vercel env add SUPABASE_DATABASE_URL production <<< "$SUPABASE_DATABASE_URL"

echo ""
echo "3. SUPABASE_URL"
echo "   Default: https://nblegrzglewrpwqogkgr.supabase.co"
read -p "   Enter SUPABASE_URL (or press Enter for default): " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-"https://nblegrzglewrpwqogkgr.supabase.co"}
vercel env add SUPABASE_URL production <<< "$SUPABASE_URL"

echo ""
echo "4. SUPABASE_ANON_KEY"
echo "   Default: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
read -p "   Enter SUPABASE_ANON_KEY (or press Enter for default): " SUPABASE_ANON_KEY
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY"}
vercel env add SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"

echo ""
echo "5. SUPABASE_SERVICE_ROLE_KEY (⚠️ KEEP SECRET!)"
echo "   Get from: Supabase Dashboard → Settings → API → service_role key"
read -p "   Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "6. JWT_SECRET"
echo "   Generate with: openssl rand -base64 32"
read -p "   Enter JWT_SECRET: " JWT_SECRET
vercel env add JWT_SECRET production <<< "$JWT_SECRET"

echo ""
echo "7. ADMIN_EMAIL"
read -p "   Enter ADMIN_EMAIL: " ADMIN_EMAIL
vercel env add ADMIN_EMAIL production <<< "$ADMIN_EMAIL"

echo ""
echo "8. ADMIN_PASSWORD"
read -p "   Enter ADMIN_PASSWORD: " ADMIN_PASSWORD
vercel env add ADMIN_PASSWORD production <<< "$ADMIN_PASSWORD"

echo ""
echo "9. NODE_ENV"
vercel env add NODE_ENV production <<< "production"

echo ""
echo "============================================"
echo "✅ All required environment variables added!"
echo "============================================"
echo ""
echo "Optional variables (if needed):"
echo "  - FORGE_API_URL (if using Forge services)"
echo "  - FORGE_API_KEY (if using Forge services)"
echo "  - OAUTH_SERVER_URL (if using OAuth)"
echo "  - APP_ID (if using OAuth)"
echo ""
echo "Next steps:"
echo "  1. Review your environment variables: vercel env ls"
echo "  2. Redeploy your application: vercel --prod"
echo ""

