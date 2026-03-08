/**
 * Authentication Service
 * Email OTP integration với Supabase Auth
 */

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AccountType = 'customer' | 'owner';

/**
 * Gửi mã OTP đăng nhập qua email
 */
export async function requestEmailOtp(email: string): Promise<{ error: Error | null }> {
  const supabase = createClient();

  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error('Email OTP request error:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Xác thực mã OTP email và hoàn tất đồng bộ hồ sơ người dùng
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  accountType: AccountType = 'customer'
): Promise<{ error: Error | null; redirectTo: string | null }> {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();

  const {
    data: { session },
    error,
  } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: 'email',
  });

  if (error) {
    console.error('Email OTP verification error:', error);
    return { error, redirectTo: null };
  }

  if (!session?.access_token) {
    return {
      error: new Error('Không lấy được phiên đăng nhập sau khi xác thực OTP.'),
      redirectTo: null,
    };
  }

  const response = await fetch('/api/auth/email-otp/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ accountType }),
  });

  const result = (await response.json().catch(() => null)) as { error?: string; redirectTo?: string } | null;

  if (!response.ok) {
    return {
      error: new Error(result?.error || 'Không thể hoàn tất đăng nhập.'),
      redirectTo: null,
    };
  }

  return {
    error: null,
    redirectTo: result?.redirectTo ?? null,
  };
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
