/**
 * Script to set admin@local.dev as admin
 * Run with: npx tsx set-admin.ts
 */

import { getUserProfileByEmail, updateUserProfile } from "./server/db.js";

async function setAdmin() {
  try {
    console.log("Looking for user: admin@local.dev");
    
    const user = await getUserProfileByEmail("admin@local.dev");
    
    if (!user) {
      console.error("❌ User admin@local.dev not found in database.");
      console.log("Please make sure the user exists in Supabase Auth first.");
      console.log("You can create the user through the Supabase dashboard or let the server create it on startup.");
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current role: ${user.role}`);

    if (user.role === "admin") {
      console.log("✅ User is already an admin. No changes needed.");
      process.exit(0);
    }

    console.log("Updating role to admin...");
    const updatedUser = await updateUserProfile(user.id, { role: "admin" });

    console.log("✅ Successfully updated user role to admin!");
    console.log(`Updated user: ${updatedUser.email} (Role: ${updatedUser.role})`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting admin role:", error);
    process.exit(1);
  }
}

setAdmin();

