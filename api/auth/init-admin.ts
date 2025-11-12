import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as db from "../../server/db";
import { ENV } from "../../server/_core/env";
import { supabaseAdmin } from "../../server/_core/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const existingAdmin = await db.getUserProfileByEmail(ENV.adminEmail);

    if (existingAdmin) {
      return res.json({ message: "Admin user already exists" });
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

    return res.json({ message: "Admin user created successfully" });
  } catch (error: any) {
    console.error("[Auth] Admin initialization failed", error);
    return res.status(500).json({ error: error.message || "Failed to initialize admin user" });
  }
}

