# ============================================
# Vercel Environment Variables Import Script (PowerShell)
# ============================================
# Usage: .\vercel-env-import.ps1
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Vercel Environment Variables Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you add environment variables to Vercel." -ForegroundColor Yellow
Write-Host "Make sure you have the Vercel CLI installed and are logged in." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to continue"

# Required variables
Write-Host ""
Write-Host "Adding REQUIRED environment variables..." -ForegroundColor Green
Write-Host ""

Write-Host "1. DATABASE_URL" -ForegroundColor White
Write-Host "   Get from: Supabase Dashboard → Settings → Database → Connection string" -ForegroundColor Gray
$DATABASE_URL = Read-Host "   Enter DATABASE_URL"
vercel env add DATABASE_URL production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "2. SUPABASE_DATABASE_URL (can be same as DATABASE_URL)" -ForegroundColor White
$SUPABASE_DATABASE_URL = Read-Host "   Enter SUPABASE_DATABASE_URL"
vercel env add SUPABASE_DATABASE_URL production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "3. SUPABASE_URL" -ForegroundColor White
Write-Host "   Default: https://nblegrzglewrpwqogkgr.supabase.co" -ForegroundColor Gray
$SUPABASE_URL = Read-Host "   Enter SUPABASE_URL (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($SUPABASE_URL)) {
    $SUPABASE_URL = "https://nblegrzglewrpwqogkgr.supabase.co"
}
vercel env add SUPABASE_URL production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "4. SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "   Default key is already in code" -ForegroundColor Gray
$SUPABASE_ANON_KEY = Read-Host "   Enter SUPABASE_ANON_KEY (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($SUPABASE_ANON_KEY)) {
    $SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY"
}
vercel env add SUPABASE_ANON_KEY production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "5. SUPABASE_SERVICE_ROLE_KEY (⚠️ KEEP SECRET!)" -ForegroundColor White
Write-Host "   Get from: Supabase Dashboard → Settings → API → service_role key" -ForegroundColor Gray
$SUPABASE_SERVICE_ROLE_KEY = Read-Host "   Enter SUPABASE_SERVICE_ROLE_KEY"
vercel env add SUPABASE_SERVICE_ROLE_KEY production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "6. JWT_SECRET" -ForegroundColor White
Write-Host "   Generate with: openssl rand -base64 32" -ForegroundColor Gray
$JWT_SECRET = Read-Host "   Enter JWT_SECRET"
vercel env add JWT_SECRET production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "7. ADMIN_EMAIL" -ForegroundColor White
$ADMIN_EMAIL = Read-Host "   Enter ADMIN_EMAIL"
vercel env add ADMIN_EMAIL production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "8. ADMIN_PASSWORD" -ForegroundColor White
$ADMIN_PASSWORD = Read-Host "   Enter ADMIN_PASSWORD" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ADMIN_PASSWORD)
$ADMIN_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
vercel env add ADMIN_PASSWORD production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "9. NODE_ENV" -ForegroundColor White
vercel env add NODE_ENV production | Out-Null
Write-Host "   ✅ Added" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ All required environment variables added!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review your environment variables: vercel env ls" -ForegroundColor White
Write-Host "  2. Redeploy your application: vercel --prod" -ForegroundColor White
Write-Host ""

