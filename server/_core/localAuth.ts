import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
};

class LocalAuthService {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Hash password using simple base64 encoding (for demo - use bcrypt in production)
   */
  async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or argon2
    // For local development, simple encoding
    return Buffer.from(password).toString('base64');
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedInput = await this.hashPassword(password);
    return hashedInput === hash;
  }

  /**
   * Create a session token for a user
   */
  async createSessionToken(
    userId: number,
    email: string,
    name: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId,
      email,
      name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify session token
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: number; email: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId, email, name } = payload as Record<string, unknown>;

      if (
        typeof userId !== "number" ||
        !isNonEmptyString(email) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        userId,
        email,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<User | null> {
    // Note: This is legacy code. Passwords are now managed by Supabase Auth.
    // This function should not be used in production.
    throw new Error("Local auth login is not supported. Use Supabase Auth instead.");
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<User | null> {
    // Note: This is legacy code. User registration is now handled by Supabase Auth.
    // This function should not be used in production.
    throw new Error("Local auth registration is not supported. Use Supabase Auth instead.");
  }

  /**
   * Authenticate request from cookie
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw new Error("Invalid session cookie");
    }

    const user = await db.getUserById(String(session.userId));

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}

export const localAuth = new LocalAuthService();
