/**
 * Authentication helpers for OTP sign-in flows.
 */

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AccountType = 'customer' | 'owner' | 'admin';

interface RequestEmailOtpOptions {
  accountType?: AccountType;
}

interface VerifyEmailOtpResult {
  error: Error | null;
  errorCode: string | null;
  redirectTo: string | null;
}

export async function requestEmailOtp(
  email: string,
  options: RequestEmailOtpOptions = {}
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const accountType = options.accountType ?? 'customer';

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: accountType !== 'admin',
    },
  });

  if (error) {
    console.error('Email OTP request error:', error);
    return { error };
  }

  return { error: null };
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  accountType: AccountType = 'customer'
): Promise<VerifyEmailOtpResult> {
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
    return { error, errorCode: null, redirectTo: null };
  }

  if (!session?.access_token) {
    return {
      error: new Error('Khong lay duoc phien dang nhap sau khi xac thuc OTP.'),
      errorCode: null,
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

  const result = (await response.json().catch(() => null)) as {
    error?: string;
    errorCode?: string;
    redirectTo?: string;
  } | null;

  if (!response.ok) {
    await supabase.auth.signOut();

    return {
      error: new Error(result?.error || 'Khong the hoan tat dang nhap.'),
      errorCode: result?.errorCode ?? null,
      redirectTo: null,
    };
  }

  return {
    error: null,
    errorCode: null,
    redirectTo: result?.redirectTo ?? null,
  };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
    return { error };
  }

  return { error: null };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Get user error:', error);
    return null;
  }

  return user;
}

export async function isAdmin(): Promise<boolean> {
  const response = await fetch('/api/users/me', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    return false;
  }

  const result = (await response.json().catch(() => null)) as { role?: string } | null;
  return result?.role === 'admin';
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
