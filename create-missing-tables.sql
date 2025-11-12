-- Create missing tables: user_sessions and login_history
-- Run this in Supabase SQL Editor if these tables are missing
-- This script creates the tables with TEXT types to match the Drizzle schema

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT, -- Stored as text (can contain JSON string)
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create login_history table for audit trail
CREATE TABLE IF NOT EXISTS public.login_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT, -- Stored as text (can contain JSON string)
  login_status TEXT NOT NULL CHECK (login_status IN ('success', 'failed', 'blocked')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
-- Allow service role to bypass RLS (for server-side operations)
DROP POLICY IF EXISTS "Service role can access all sessions" ON public.user_sessions;
CREATE POLICY "Service role can access all sessions"
  ON public.user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
CREATE POLICY "Users can delete their own sessions"
  ON public.user_sessions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public insert for user_sessions" ON public.user_sessions;
CREATE POLICY "Allow public insert for user_sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for login_history
-- Allow service role to bypass RLS (for server-side operations)
DROP POLICY IF EXISTS "Service role can access all login history" ON public.login_history;
CREATE POLICY "Service role can access all login history"
  ON public.login_history FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;
CREATE POLICY "Users can view their own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public insert for login history" ON public.login_history;
CREATE POLICY "Allow public insert for login history"
  ON public.login_history FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.user_sessions TO anon, authenticated;
GRANT ALL ON public.login_history TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE login_history_id_seq TO anon, authenticated;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

