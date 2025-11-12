import { pgTable, serial, integer, text, real, timestamp, boolean, uuid, pgEnum } from "drizzle-orm/pg-core";

// Define the enum type
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/**
 * User profiles table - extends Supabase Auth users
 * Supabase Auth handles authentication, this table stores additional user data
 * Note: id references auth.users.id (foreign key constraint should be added in Supabase)
 */
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // References auth.users.id
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("user"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Legacy User type for compatibility
export type User = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  avatarUrl: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};
export type InsertUser = {
  email: string;
  name?: string | null;
  role?: "user" | "admin";
  avatarUrl?: string | null;
  phone?: string | null;
};

/**
 * Vehicle table for storing user vehicles
 */
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  fuelType: text("fuel_type").notNull(),
  deviceId: text("device_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Emission readings from IoT devices
 */
export const emissionReadings = pgTable("emission_readings", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  co2: real("co2"),
  co: real("co"),
  nox: real("nox"),
  pmLevel: real("pm_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmissionReading = typeof emissionReadings.$inferSelect;
export type InsertEmissionReading = typeof emissionReadings.$inferInsert;

/**
 * Alerts for non-compliant emission readings
 */
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  gasType: text("gas_type").notNull(),
  measuredValue: real("measured_value").notNull(),
  thresholdValue: real("threshold_value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * User sessions table for session management
 */
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: text("device_info"), // JSONB stored as text in Drizzle
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

/**
 * Login history table for audit trail
 */
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: text("device_info"), // JSONB stored as text in Drizzle
  loginStatus: text("login_status").notNull(), // 'success', 'failed', 'blocked'
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;