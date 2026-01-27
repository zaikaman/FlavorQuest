/**
 * Authentication Service
 * Google OAuth integration với Supabase Auth
 */

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Sign in với Google OAuth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google sign in error:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Get user error:', error);
    return null;
  }

  return user;
}

/**
 * Check if current user is admin
 * Kiểm tra email có trong ADMIN_EMAILS environment variable
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user?.email) {
    return false;
  }

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '';
  const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());

  return adminList.includes(user.email.toLowerCase());
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
