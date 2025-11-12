import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ONE_YEAR_MS } from "../../shared/const";
import * as db from "../../server/db";
import { getSessionCookieOptions } from "../../server/_core/cookies";
import { supabaseAuth } from "../../server/_core/supabaseAuth";
import { randomUUID } from "crypto";

// Helper function to get client IP address
function getClientIp(req: VercelRequest): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return (req.headers["x-real-ip"] as string) || null;
}

// Helper function to extract device info from user agent
function getDeviceInfo(req: VercelRequest): Record<string, any> {
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
  req: VercelRequest,
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

function setCookie(res: VercelResponse, name: string, value: string, options: any) {
  const cookieOptions = options || {};
  const cookieParts = [`${name}=${value}`];
  
  if (cookieOptions.maxAge) {
    cookieParts.push(`Max-Age=${cookieOptions.maxAge}`);
  }
  if (cookieOptions.path) {
    cookieParts.push(`Path=${cookieOptions.path}`);
  }
  if (cookieOptions.domain) {
    cookieParts.push(`Domain=${cookieOptions.domain}`);
  }
  if (cookieOptions.secure) {
    cookieParts.push("Secure");
  }
  if (cookieOptions.httpOnly) {
    cookieParts.push("HttpOnly");
  }
  if (cookieOptions.sameSite) {
    cookieParts.push(`SameSite=${cookieOptions.sameSite}`);
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
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
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { user, accessToken, refreshToken } = result;
    const sessionToken = randomUUID();

    // Create session and login history
    await createSessionAndHistory(user.id, sessionToken, req, "success");

    // Set access token and refresh token in cookies
    const cookieOptions = getSessionCookieOptions(req as any);
    setCookie(res, "sb-access-token", accessToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
    setCookie(res, "sb-refresh-token", refreshToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });
    setCookie(res, "sb-session-token", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("[Auth] Login failed", error);
    return res.status(500).json({ error: "Login failed" });
  }
}

