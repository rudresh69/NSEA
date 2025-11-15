import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { supabaseAdmin, createSupabaseClient } from "./supabase";
import * as db from "../db";
import type { User } from "../../drizzle/schema";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

class SupabaseAuthService {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Get access token from request
   */
  private getAccessToken(req: any): string | null {
    // Try to get from Authorization header first
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try to get from cookie
    const cookies = this.parseCookies(req.headers?.cookie);
    const accessToken = cookies.get("sb-access-token");
    if (accessToken) {
      return accessToken;
    }

    return null;
  }

  /**
   * Authenticate user with email and password using Supabase Auth
   */
  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const supabase = createSupabaseClient();

    // @ts-ignore - auth methods exist on Supabase client
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn("[Auth] Login failed:", {
        message: error.message,
        status: error.status,
        email: email,
      });
      return null;
    }

    if (!data.user || !data.session) {
      console.warn("[Auth] Login failed: No user or session returned");
      return null;
    }

    // Get or create user profile
    let userProfile = await db.getUserProfileById(data.user.id);
    if (!userProfile) {
      // Create user profile if it doesn't exist
      try {
        await db.createUserProfile(data.user.id, {
          email: data.user.email || email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || null,
          role: "user",
        });
        userProfile = await db.getUserProfileById(data.user.id);
        
        if (!userProfile) {
          console.error("[Auth] Failed to create user profile after creation attempt");
          return null;
        }
      } catch (profileError: any) {
        console.error("[Auth] Error creating user profile:", profileError);
        // If profile creation fails, try to get it again (might have been created by trigger)
        userProfile = await db.getUserProfileById(data.user.id);
        if (!userProfile) {
          console.error("[Auth] User profile not found and creation failed");
          return null;
        }
      }
    } else {
      // Update last sign in
      try {
        await db.updateUserLastSignIn(data.user.id);
      } catch (error) {
        // Non-critical error, log but continue
        console.warn("[Auth] Failed to update last sign in:", error);
      }
    }

    return {
      user: userProfile,
      accessToken: data.session?.access_token || "",
      refreshToken: data.session?.refresh_token || "",
    };
  }

  /**
   * Register a new user using Supabase Auth
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const supabase = createSupabaseClient();

    // Check if user already exists
    const existing = await db.getUserProfileByEmail(email);
    if (existing) {
      throw new Error("User already exists");
    }

    // @ts-ignore - auth methods exist on Supabase client
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
      },
    });

    if (error || !data.user) {
      console.error("[Auth] Registration failed:", error?.message);
      throw new Error(error?.message || "Registration failed");
    }

    // Create user profile
    await db.createUserProfile(data.user.id, {
      email: data.user.email || email,
      name,
      role: "user",
    });

    const userProfile = await db.getUserProfileById(data.user.id);
    if (!userProfile) {
      throw new Error("Failed to create user profile");
    }

    return {
      user: userProfile,
      accessToken: data.session?.access_token || "",
      refreshToken: data.session?.refresh_token || "",
    };
  }

  /**
   * Authenticate request from access token
   */
  async authenticateRequest(req: any): Promise<User> {
    const accessToken = this.getAccessToken(req);

    if (!accessToken) {
      throw new Error("No access token provided");
    }

    // Verify token with Supabase
    const supabase = createSupabaseClient(accessToken);
    // @ts-ignore - auth methods exist on Supabase client
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      throw new Error("Invalid or expired token");
    }

    // Get user profile
    const user = await db.getUserProfileById(authUser.id);

    if (!user) {
      // Auto-create profile if it doesn't exist
      await db.createUserProfile(authUser.id, {
        email: authUser.email || "",
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
        role: "user",
      });
      const newUser = await db.getUserProfileById(authUser.id);
      if (!newUser) {
        throw new Error("User not found");
      }
      return newUser;
    }

    // Update last sign in
    await db.updateUserLastSignIn(authUser.id);

    return user;
  }

  /**
   * Verify session token (for backward compatibility)
   */
  async verifySession(
    accessToken: string | undefined | null
  ): Promise<{ userId: string; email: string; name: string } | null> {
    if (!accessToken) {
      return null;
    }

    try {
      const supabase = createSupabaseClient(accessToken);
      // @ts-ignore - auth methods exist on Supabase client
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const userProfile = await db.getUserProfileById(user.id);
      if (!userProfile) {
        return null;
      }

      return {
        userId: user.id,
        email: userProfile.email,
        name: userProfile.name || "",
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
}

export const supabaseAuth = new SupabaseAuthService();

