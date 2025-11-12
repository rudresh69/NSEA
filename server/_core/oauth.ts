import { ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { supabaseAuth } from "./supabaseAuth";
import { ENV } from "./env";
import { supabaseAdmin } from "./supabase";
import { randomUUID } from "crypto";

// Helper function to get client IP address
function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || null;
}

// Helper function to extract device info from user agent
function getDeviceInfo(req: Request): Record<string, any> {
  const userAgent = req.headers["user-agent"] || "";
  return {
    userAgent,
    ip: getClientIp(req),
    platform: req.headers["sec-ch-ua-platform"] || "Unknown",
  };
}

// Helper function to create session and login history
async function createSessionAndHistory(
  userId: string,
  sessionToken: string,
  req: Request,
  loginStatus: "success" | "failed" | "blocked",
  failureReason?: string
) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;
  const deviceInfo = getDeviceInfo(req);

  try {
    // Create login history (only if table exists)
    try {
      await db.createLoginHistory({
        userId,
        ipAddress,
        userAgent,
        deviceInfo: JSON.stringify(deviceInfo),
        loginStatus,
        failureReason: failureReason || null,
      });
    } catch (historyError: any) {
      // If table doesn't exist (PGRST205), just log and continue
      if (historyError?.code === "PGRST205") {
        console.warn("[Auth] login_history table not found. Run migration SQL to enable login history tracking.");
      } else {
        console.error("[DB] Error creating login history:", historyError);
      }
    }

    // Create session only on successful login
    if (loginStatus === "success") {
      try {
        const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
        await db.createUserSession({
          userId,
          sessionToken,
          ipAddress,
          userAgent,
          deviceInfo: JSON.stringify(deviceInfo),
          isActive: true,
          expiresAt,
          lastAccessedAt: new Date(),
        });
      } catch (sessionError: any) {
        // If table doesn't exist (PGRST205), just log and continue
        if (sessionError?.code === "PGRST205") {
          console.warn("[Auth] user_sessions table not found. Run migration SQL to enable session tracking.");
        } else {
          console.error("[DB] Error creating session:", sessionError);
        }
      }
    }
  } catch (error) {
    console.error("[Auth] Error creating session/history:", error);
    // Don't throw - this is not critical for login flow
  }
}

export function registerOAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // Get user profile to check if user exists (for login history)
      const userProfile = await db.getUserProfileByEmail(email);
      const userId = userProfile?.id || "unknown";

      const result = await supabaseAuth.login(email, password);

      if (!result) {
        // Log failed login attempt
        if (userProfile) {
          await createSessionAndHistory(
            userProfile.id,
            "",
            req,
            "failed",
            "Invalid email or password"
          );
        }
        console.error("[Auth] Login attempt failed for:", email);
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const { user, accessToken, refreshToken } = result;
      const sessionToken = randomUUID();

      // Create session and login history
      await createSessionAndHistory(user.id, sessionToken, req, "success");

      // Set access token and refresh token in cookies
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("sb-access-token", accessToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
      res.cookie("sb-refresh-token", refreshToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
      res.cookie("sb-session-token", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });

      res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, phone: user.phone },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: "Email, password, and name are required" });
        return;
      }

      const result = await supabaseAuth.register(email, password, name);

      if (!result) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const { user, accessToken, refreshToken } = result;
      const sessionToken = randomUUID();

      // Create session and login history
      await createSessionAndHistory(user.id, sessionToken, req, "success");

      // Set access token and refresh token in cookies
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("sb-access-token", accessToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
      res.cookie("sb-refresh-token", refreshToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
      res.cookie("sb-session-token", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });

      res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, phone: user.phone },
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error("[Auth] Registration failed", error);
      if (error.message === "User already exists") {
        res.status(409).json({ error: "User already exists" });
      } else {
        res.status(500).json({ error: error.message || "Registration failed" });
      }
    }
  });

  // Initialize admin user
  app.post("/api/auth/init-admin", async (req: Request, res: Response) => {
    try {
      const existingAdmin = await db.getUserProfileByEmail(ENV.adminEmail);
      
      if (existingAdmin) {
        res.json({ message: "Admin user already exists" });
        return;
      }

      // Create admin user via Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: ENV.adminEmail,
        password: ENV.adminPassword,
        email_confirm: true,
        user_metadata: {
          name: "Administrator",
          full_name: "Administrator",
        },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create admin user");
      }

      // Create admin profile
      await db.createUserProfile(authData.user.id, {
        email: ENV.adminEmail,
        name: "Administrator",
        role: "admin",
      });

      res.json({ message: "Admin user created successfully" });
    } catch (error: any) {
      console.error("[Auth] Admin initialization failed", error);
      res.status(500).json({ error: error.message || "Failed to initialize admin user" });
    }
  });
}
