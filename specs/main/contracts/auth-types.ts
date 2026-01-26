// @ts-nocheck
/**
 * Authentication & User Management Type Definitions
 *
 * Định nghĩa types cho Supabase authentication và user management
 */

import type { Database } from './database.types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Extract user type từ Supabase generated types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * User roles
 */
export type UserRole = 'user' | 'admin';

/**
 * Extended user info (Supabase auth user + custom user table)
 */
export interface ExtendedUser {
  // Supabase auth fields
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;

  // Custom user table fields
  role: UserRole;
}

/**
 * Auth session state
 */
export interface AuthSession {
  user: ExtendedUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
}

/**
 * POST /api/auth/signin
 * Initiate Google OAuth sign-in
 */
export interface SignInRequest {
  // No body - redirects to Google OAuth
}

export interface SignInResponse {
  success: boolean;
  data?: {
    redirect_url: string; // Google OAuth URL
  };
  error?: string;
}

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Google
 */
export interface AuthCallbackRequest {
  code: string; // OAuth code from Google
}

export interface AuthCallbackResponse {
  success: boolean;
  data?: {
    user: ExtendedUser;
    session: Session;
  };
  error?: string;
}

/**
 * POST /api/auth/signout
 * Sign out current user
 */
export interface SignOutRequest {
  // No body needed
}

export interface SignOutResponse {
  success: boolean;
  error?: string;
}

/**
 * GET /api/auth/session
 * Get current auth session
 */
export interface GetSessionRequest {
  // No params needed
}

export interface GetSessionResponse {
  success: boolean;
  data?: {
    user: ExtendedUser | null;
    session: Session | null;
  };
  error?: string;
}

/**
 * GET /api/admin/users (Admin only)
 * Lấy danh sách tất cả users
 */
export interface GetUsersRequest {
  page?: number; // Default: 1
  limit?: number; // Default: 50
  role?: UserRole; // Filter by role
}

export interface GetUsersResponse {
  success: boolean;
  data?: {
    users: ExtendedUser[];
    total: number;
    page: number;
    limit: number;
  };
  error?: string;
}

/**
 * PATCH /api/admin/users/:id (Admin only)
 * Update user role
 */
export interface UpdateUserRoleRequest {
  user_id: string;
  role: UserRole;
}

export interface UpdateUserRoleResponse {
  success: boolean;
  data?: ExtendedUser;
  error?: string;
}

/**
 * Helper function types
 */

/**
 * Check if user is authenticated
 */
export function isAuthenticated(session: AuthSession): boolean;

/**
 * Check if user is admin
 */
export function isAdmin(session: AuthSession): boolean;

/**
 * Get user from session
 */
export function getUser(session: AuthSession): ExtendedUser | null;

/**
 * Sign in with Google
 */
export function signInWithGoogle(): Promise<void>;

/**
 * Sign out current user
 */
export function signOut(): Promise<void>;

/**
 * Get current session
 */
export function getCurrentSession(): Promise<AuthSession>;

/**
 * Refresh session
 */
export function refreshSession(): Promise<Session | null>;
