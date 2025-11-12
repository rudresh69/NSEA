-- Supabase Database Migration
-- Run this SQL in your Supabase SQL Editor to set up the database schema
-- Make sure to run this in the SQL Editor, not in a migration

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS emission_readings CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Create user_role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_signed_in TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create emission_readings table
CREATE TABLE IF NOT EXISTS emission_readings (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  co2 REAL,
  co REAL,
  nox REAL,
  pm_level REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  gas_type TEXT NOT NULL,
  measured_value REAL NOT NULL,
  threshold_value REAL NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create login_history table for audit trail
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  login_status TEXT NOT NULL CHECK (login_status IN ('success', 'failed', 'blocked')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_device_id ON vehicles(device_id);
CREATE INDEX IF NOT EXISTS idx_emission_readings_vehicle_id ON emission_readings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_emission_readings_timestamp ON emission_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all profiles"
  ON user_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for vehicles
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all vehicles"
  ON vehicles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own vehicles"
  ON vehicles FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own vehicles"
  ON vehicles FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own vehicles"
  ON vehicles FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for emission_readings
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all emission readings"
  ON emission_readings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view emission readings for their vehicles"
  ON emission_readings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = emission_readings.vehicle_id
      AND vehicles.owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow public insert for emission readings (for IoT devices)"
  ON emission_readings FOR INSERT
  WITH CHECK (true);

-- RLS Policies for alerts
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all alerts"
  ON alerts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view alerts for their vehicles"
  ON alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = alerts.vehicle_id
      AND vehicles.owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow public insert for alerts"
  ON alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_sessions
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all sessions"
  ON user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for login_history
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can access all login history"
  ON login_history FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own login history"
  ON login_history FOR SELECT
  USING (auth.uid() = user_id);

-- Allow public insert for login history (for server-side operations)
CREATE POLICY "Allow public insert for login history"
  ON login_history FOR INSERT
  WITH CHECK (true);

-- Function to automatically create user profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO anon, authenticated;
GRANT ALL ON vehicles TO anon, authenticated;
GRANT ALL ON emission_readings TO anon, authenticated;
GRANT ALL ON alerts TO anon, authenticated;
GRANT ALL ON user_sessions TO anon, authenticated;
GRANT ALL ON login_history TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Allow public insert for user_sessions (for server-side operations)
CREATE POLICY "Allow public insert for user_sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

