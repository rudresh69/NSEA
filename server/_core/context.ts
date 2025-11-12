import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { supabaseAuth } from "./supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await supabaseAuth.authenticateRequest(opts.req);
  } catch (error: any) {
    // Authentication is optional for public procedures.
    // Silently fail - don't log errors for missing auth tokens
    if (error?.message !== "No access token provided") {
      // Only log unexpected errors
      console.debug("[Auth] Context: No authenticated user", error?.message);
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
