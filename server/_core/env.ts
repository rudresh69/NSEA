export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-key",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@local.dev",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
  // Supabase configuration
  supabaseUrl: process.env.SUPABASE_URL ?? "https://nblegrzglewrpwqogkgr.supabase.co",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGVncnpnbGV3cnB3cW9na2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzM2NDMsImV4cCI6MjA3ODU0OTY0M30.uxsb-MFcLeRL4T1Cpe0ji-X5o660RLkfhVfRrrsa5YY",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Forge API configuration
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
  // OAuth configuration
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  appId: process.env.APP_ID ?? "",
};
