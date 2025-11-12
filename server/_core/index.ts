import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";
import { ENV } from "./env";
import { supabaseAdmin } from "./supabase";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function initializeAdminUser() {
  try {
    // First, check if the database tables exist by trying a simple query
    const { error: tableCheckError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .limit(1);

    if (tableCheckError) {
      if (tableCheckError.code === "PGRST205") {
        console.warn("[Auth] ⚠️  Database tables not found!");
        console.warn("[Auth] Please run the migration SQL in Supabase SQL Editor:");
        console.warn("[Auth] 1. Go to: https://supabase.com/dashboard/project/nblegrzglewrpwqogkgr/sql/new");
        console.warn("[Auth] 2. Copy contents of 'supabase-migration.sql'");
        console.warn("[Auth] 3. Paste and run in SQL Editor");
        console.warn("[Auth] 4. Restart the server");
        return;
      }
      throw tableCheckError;
    }

    const existingAdmin = await db.getUserProfileByEmail(ENV.adminEmail);
    
    if (!existingAdmin) {
      // Check if auth user exists first
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === ENV.adminEmail);

      let authUserId: string;

      if (existingAuthUser) {
        // Auth user exists, use it
        authUserId = existingAuthUser.id;
        console.log(`[Auth] Found existing auth user for ${ENV.adminEmail}`);
      } else {
        // Check if we have service role key (required for admin operations)
        if (!ENV.supabaseServiceRoleKey) {
          console.warn("[Auth] ⚠️  SUPABASE_SERVICE_ROLE_KEY not set!");
          console.warn("[Auth] Cannot create admin user automatically.");
          console.warn("[Auth] Please either:");
          console.warn("[Auth] 1. Set SUPABASE_SERVICE_ROLE_KEY in .env file");
          console.warn("[Auth] 2. Or create admin user manually in Supabase Dashboard:");
          console.warn("[Auth]    - Go to Authentication > Users > Add User");
          console.warn("[Auth]    - Email: " + ENV.adminEmail);
          console.warn("[Auth]    - Password: " + ENV.adminPassword);
          console.warn("[Auth]    - Check 'Auto Confirm User'");
          return;
        }

        // Create new admin user via Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: ENV.adminEmail,
          password: ENV.adminPassword,
          email_confirm: true,
          user_metadata: {
            name: "Administrator",
            full_name: "Administrator",
          },
        });

        if (authError) {
          console.error("[Auth] Failed to create admin user in Supabase:", {
            message: authError.message,
            status: authError.status,
          });
          console.error("[Auth] You may need to create the user manually in Supabase Dashboard");
          return;
        }

        if (!authData.user) {
          console.error("[Auth] Failed to create admin user: No user returned");
          return;
        }

        authUserId = authData.user.id;
        console.log(`[Auth] Created new auth user for ${ENV.adminEmail}`);
      }

      // Create or update admin profile (upsert handles duplicates)
      await db.createUserProfile(authUserId, {
        email: ENV.adminEmail,
        name: "Administrator",
        role: "admin",
      });
      console.log(`[Auth] ✅ Admin user profile ready: ${ENV.adminEmail}`);
    } else {
      console.log(`[Auth] ✅ Admin user already exists`);
    }
  } catch (error: any) {
    if (error?.code === "PGRST205") {
      console.warn("[Auth] ⚠️  Database tables not found! Please run the migration SQL.");
    } else {
      console.error("[Auth] Failed to initialize admin user:", error);
    }
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Initialize admin user
  await initializeAdminUser();
  
  // Auth routes (login, register)
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
