import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin: SupabaseClient<any> = createClient(
  ENV.supabaseUrl,
  ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client-side Supabase client (for user operations)
export function createSupabaseClient(accessToken?: string): SupabaseClient<any> {
  const client = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });

  return client;
}

