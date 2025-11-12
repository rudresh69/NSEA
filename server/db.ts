import { supabaseAdmin } from "./_core/supabase";
import type { User, InsertUser, Vehicle, InsertVehicle, EmissionReading, InsertEmissionReading, Alert, InsertAlert, UserSession, InsertUserSession, LoginHistory, InsertLoginHistory } from "../drizzle/schema";

// User profile functions
export async function createUserProfile(userId: string, user: Omit<InsertUser, "id">): Promise<string> {
  // Use upsert to handle case where profile already exists
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({
      id: userId,
      email: user.email,
      name: user.name || null,
      role: user.role || "user",
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating user profile:", error);
    throw error;
  }

  return data.id;
}

// Helper function to transform user profile
function transformUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    lastSignedIn: new Date(data.last_signed_in),
  };
}

export async function getUserProfileByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("[DB] Error getting user by email:", error);
    throw error;
  }

  return transformUser(data);
}

export async function getUserProfileById(id: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("[DB] Error getting user by id:", error);
    throw error;
  }

  return transformUser(data);
}

export async function updateUserLastSignIn(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      last_signed_in: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[DB] Error updating last sign in:", error);
    throw error;
  }
}

export async function upsertUserProfile(userId: string, user: Partial<InsertUser>): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({
      id: userId,
      email: user.email || "",
      name: user.name || null,
      role: user.role || "user",
      avatar_url: user.avatarUrl || null,
      phone: user.phone || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error upserting user profile:", error);
    throw error;
  }

  return transformUser(data);
}

export async function updateUserProfile(userId: string, updates: Partial<InsertUser>): Promise<User> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.role !== undefined) updateData.role = updates.role;

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("[DB] Error updating user profile:", error);
    throw error;
  }

  return transformUser(data);
}

// Legacy functions for compatibility (will be removed after migration)
export async function createUser(user: Omit<InsertUser, "id">): Promise<string> {
  // This should not be used - users should be created via Supabase Auth
  throw new Error("createUser should not be used. Use Supabase Auth to create users.");
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const user = await getUserProfileByEmail(email);
  return user || undefined;
}

export async function getUserById(id: string | number): Promise<User | undefined> {
  const userId = typeof id === "string" ? id : String(id);
  const user = await getUserProfileById(userId);
  return user || undefined;
}

// OAuth-specific functions (stubs for compatibility)
// Note: openId is mapped to email in the current schema
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  // For now, treat openId as email identifier
  const user = await getUserProfileByEmail(openId);
  return user || undefined;
}

// Legacy upsertUser function for OAuth compatibility
// Note: This function accepts openId but maps it to email
export async function upsertUser(userData: {
  openId?: string;
  email?: string | null;
  name?: string | null;
  role?: "user" | "admin";
  avatarUrl?: string | null;
  phone?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}): Promise<User> {
  // Use openId as email if email is not provided
  const email = userData.email || userData.openId || "";
  if (!email) {
    throw new Error("Either email or openId must be provided");
  }

  // Try to find existing user by email
  const existingUser = await getUserProfileByEmail(email);
  
  if (existingUser) {
    // Update existing user
    const updates: Partial<InsertUser> = {};
    if (userData.name !== undefined) updates.name = userData.name;
    if (userData.role !== undefined) updates.role = userData.role;
    if (userData.avatarUrl !== undefined) updates.avatarUrl = userData.avatarUrl;
    if (userData.phone !== undefined) updates.phone = userData.phone;
    
    if (Object.keys(updates).length > 0) {
      return await updateUserProfile(existingUser.id, updates);
    }
    
    // Update last signed in if provided
    if (userData.lastSignedIn) {
      await updateUserLastSignIn(existingUser.id);
    }
    
    return existingUser;
  } else {
    // Create new user profile
    // Note: This requires a Supabase Auth user to exist first
    // For OAuth flows, the user should be created via Supabase Auth
    throw new Error("User must be created via Supabase Auth first. Cannot create user profile without auth user.");
  }
}

// Helper function to transform Supabase snake_case to camelCase
function transformVehicle(data: any): Vehicle {
  return {
    id: data.id,
    ownerId: data.owner_id,
    make: data.make,
    model: data.model,
    fuelType: data.fuel_type,
    deviceId: data.device_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// Vehicle functions
export async function getUserVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting user vehicles:", error);
    throw error;
  }

  return (data || []).map(transformVehicle);
}

export async function getVehicleById(vehicleId: number): Promise<Vehicle | undefined> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return undefined; // Not found
    }
    console.error("[DB] Error getting vehicle by id:", error);
    throw error;
  }

  return transformVehicle(data);
}

export async function getVehicleByDeviceId(deviceId: string): Promise<Vehicle | undefined> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return undefined; // Not found
    }
    console.error("[DB] Error getting vehicle by device id:", error);
    throw error;
  }

  return transformVehicle(data);
}

export async function createVehicle(vehicle: Omit<InsertVehicle, "id">): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .insert({
      owner_id: vehicle.ownerId as string,
      make: vehicle.make,
      model: vehicle.model,
      fuel_type: vehicle.fuelType,
      device_id: vehicle.deviceId,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating vehicle:", error);
    throw error;
  }

  return { success: true, id: data.id };
}

export async function deleteVehicle(vehicleId: number, userId: string): Promise<boolean> {
  // First verify the vehicle belongs to the user
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle || (vehicle as any).ownerId !== userId) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("owner_id", userId);

  if (error) {
    console.error("[DB] Error deleting vehicle:", error);
    throw error;
  }

  return true;
}

// Helper function to transform emission reading
function transformEmissionReading(data: any): EmissionReading {
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    timestamp: new Date(data.timestamp),
    co2: data.co2,
    co: data.co,
    nox: data.nox,
    pmLevel: data.pm_level,
    createdAt: new Date(data.created_at),
  };
}

// Emission reading functions
export async function getLatestEmissionReading(vehicleId: number): Promise<EmissionReading | undefined> {
  const { data, error } = await supabaseAdmin
    .from("emission_readings")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return undefined; // Not found
    }
    console.error("[DB] Error getting latest emission reading:", error);
    throw error;
  }

  return transformEmissionReading(data);
}

export async function getEmissionHistory(vehicleId: number, hoursBack: number = 24): Promise<EmissionReading[]> {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("emission_readings")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("timestamp", cutoffTime)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("[DB] Error getting emission history:", error);
    throw error;
  }

  return (data || []).map(transformEmissionReading);
}

export async function createEmissionReading(reading: Omit<InsertEmissionReading, "id">): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("emission_readings")
    .insert({
      vehicle_id: reading.vehicleId,
      co2: reading.co2 || null,
      co: reading.co || null,
      nox: reading.nox || null,
      pm_level: reading.pmLevel || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating emission reading:", error);
    throw error;
  }

  return { success: true, id: data.id };
}

// Helper function to transform alert
function transformAlert(data: any): Alert {
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    timestamp: new Date(data.timestamp),
    gasType: data.gas_type,
    measuredValue: data.measured_value,
    thresholdValue: data.threshold_value,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// Alert functions
export async function getActiveAlerts(): Promise<Alert[]> {
  const { data, error } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting active alerts:", error);
    throw error;
  }

  return (data || []).map(transformAlert);
}

export async function getVehicleAlerts(vehicleId: number): Promise<Alert[]> {
  const { data, error } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting vehicle alerts:", error);
    throw error;
  }

  return (data || []).map(transformAlert);
}

export async function createAlert(alert: Omit<InsertAlert, "id">): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("alerts")
    .insert({
      vehicle_id: alert.vehicleId,
      gas_type: alert.gasType,
      measured_value: alert.measuredValue,
      threshold_value: alert.thresholdValue,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating alert:", error);
    throw error;
  }

  return { success: true, id: data.id };
}

// Session management functions
export async function createUserSession(session: Omit<InsertUserSession, "id">): Promise<UserSession> {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .insert({
      user_id: session.userId,
      session_token: session.sessionToken,
      ip_address: session.ipAddress || null,
      user_agent: session.userAgent || null,
      device_info: session.deviceInfo ? (typeof session.deviceInfo === "string" ? JSON.parse(session.deviceInfo) : session.deviceInfo) : null,
      is_active: session.isActive ?? true,
      expires_at: session.expiresAt.toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating user session:", error);
    throw error;
  }

  return data as UserSession;
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("last_accessed_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting user sessions:", error);
    throw error;
  }

  return (data || []) as UserSession[];
}

export async function revokeUserSession(sessionId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("[DB] Error revoking user session:", error);
    throw error;
  }

  return true;
}

export async function revokeAllUserSessions(userId: string, excludeSessionId?: string): Promise<boolean> {
  let query = supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (excludeSessionId) {
    query = query.neq("id", excludeSessionId);
  }

  const { error } = await query;

  if (error) {
    console.error("[DB] Error revoking all user sessions:", error);
    throw error;
  }

  return true;
}

export async function updateSessionLastAccessed(sessionToken: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("session_token", sessionToken)
    .eq("is_active", true);

  if (error) {
    console.error("[DB] Error updating session last accessed:", error);
    // Don't throw - this is not critical
  }
}

// Login history functions
export async function createLoginHistory(history: Omit<InsertLoginHistory, "id">): Promise<LoginHistory> {
  const { data, error } = await supabaseAdmin
    .from("login_history")
    .insert({
      user_id: history.userId,
      ip_address: history.ipAddress || null,
      user_agent: history.userAgent || null,
      device_info: history.deviceInfo ? (typeof history.deviceInfo === "string" ? JSON.parse(history.deviceInfo) : history.deviceInfo) : null,
      login_status: history.loginStatus,
      failure_reason: history.failureReason || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error creating login history:", error);
    throw error;
  }

  return data as LoginHistory;
}

export async function getUserLoginHistory(userId: string, limit: number = 50): Promise<LoginHistory[]> {
  const { data, error } = await supabaseAdmin
    .from("login_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Error getting user login history:", error);
    throw error;
  }

  return (data || []) as LoginHistory[];
}

// Admin functions
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting all users:", error);
    throw error;
  }

  return (data || []).map(transformUser);
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error getting all vehicles:", error);
    throw error;
  }

  return (data || []).map(transformVehicle);
}

export async function getAllEmissionReadings(limit: number = 100): Promise<EmissionReading[]> {
  const { data, error } = await supabaseAdmin
    .from("emission_readings")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Error getting all emission readings:", error);
    throw error;
  }

  return (data || []).map(transformEmissionReading);
}

export async function getSystemStats() {
  // Get total counts
  const [usersResult, vehiclesResult, readingsResult, alertsResult] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("vehicles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("emission_readings").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("alerts").select("id", { count: "exact", head: true }),
  ]);

  // Get active alerts count
  const { count: activeAlertsCount } = await supabaseAdmin
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  // Get recent readings (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentReadingsCount } = await supabaseAdmin
    .from("emission_readings")
    .select("id", { count: "exact", head: true })
    .gte("timestamp", twentyFourHoursAgo);

  // Get admin users count
  const { count: adminUsersCount } = await supabaseAdmin
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  return {
    totalUsers: usersResult.count || 0,
    totalVehicles: vehiclesResult.count || 0,
    totalReadings: readingsResult.count || 0,
    totalAlerts: alertsResult.count || 0,
    activeAlerts: activeAlertsCount || 0,
    recentReadings: recentReadingsCount || 0,
    adminUsers: adminUsersCount || 0,
  };
}
