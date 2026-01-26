-- Migration: 003_create_users
-- Description: Create users table for admin authentication and role management
-- Created: 2026-01-26
-- Note: Regular tour users do NOT need accounts. This is only for admin access.

-- ============================================
-- Users Table (extends Supabase auth.users)
-- ============================================
CREATE TABLE users (
  -- Primary Key (matches Supabase auth.users.id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User email (synced from auth.users)
  email TEXT NOT NULL UNIQUE,
  
  -- User role (default: 'user', can be promoted to 'admin')
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- Index for role filtering (find all admins)
CREATE INDEX idx_users_role ON users(role) WHERE role = 'admin';

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile when new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update user roles
CREATE POLICY "Admins can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: No one can delete users (managed through auth.users cascade)
-- Users are deleted when auth.users record is deleted

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Promote user to admin (admin only)
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Promote to admin
  UPDATE users
  SET role = 'admin', updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Demote admin to user (admin only)
CREATE OR REPLACE FUNCTION demote_to_user(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Prevent demoting self
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  -- Demote to user
  UPDATE users
  SET role = 'user', updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Initial Admin Setup
-- ============================================

-- Note: Admins will be identified by email in ADMIN_EMAILS env var
-- Application logic will check if user's email is in the admin list
-- This allows flexible admin management without database changes

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE users IS 'User profiles for admin authentication and role management';
COMMENT ON COLUMN users.id IS 'User ID (matches auth.users.id)';
COMMENT ON COLUMN users.role IS 'User role: user (default) or admin';
COMMENT ON FUNCTION is_admin IS 'Check if a user ID has admin role';
COMMENT ON FUNCTION current_user_is_admin IS 'Check if current authenticated user is admin';
COMMENT ON FUNCTION promote_to_admin IS 'Promote user to admin role (admin only)';
COMMENT ON FUNCTION demote_to_user IS 'Demote admin to user role (admin only, cannot demote self)';
