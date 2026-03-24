/**
 * Authentication helpers for OTP sign-in flows.
 */

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const OTP_REQUEST_TIMEOUT_MS = 10000;
const OTP_VERIFY_TIMEOUT_MS = 15000;
const OTP_COMPLETE_TIMEOUT_MS = 10000;

export type AccountType = 'customer' | 'owner' | 'admin';

interface RequestEmailOtpOptions {
  accountType?: AccountType;
}

interface RequestEmailOtpResult {
  error: Error | null;
  errorCode: string | null;
}

interface VerifyEmailOtpResult {
  error: Error | null;
  errorCode: string | null;
  redirectTo: string | null;
}

async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  label: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function prepareEmailOtp(email: string, accountType: AccountType) {
  let response: Response;

  try {
    response = await fetchWithTimeout(
      '/api/auth/email-otp/prepare',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          accountType,
        }),
      },
      OTP_REQUEST_TIMEOUT_MS,
      'prepareEmailOtp'
    );
  } catch (error) {
    console.error('Prepare email OTP error:', error);
    return {
      error: new Error(''),
      errorCode: null,
    };
  }

  const result = (await response.json().catch(() => null)) as {
    error?: string;
    errorCode?: string;
  } | null;

  if (!response.ok) {
    return {
      error: new Error(result?.error || 'Khong the chuan bi dang nhap OTP.'),
      errorCode: result?.errorCode ?? null,
    };
  }

  return {
    error: null,
    errorCode: null,
  };
}

export async function requestEmailOtp(
  email: string,
  options: RequestEmailOtpOptions = {}
): Promise<RequestEmailOtpResult> {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const accountType = options.accountType ?? 'customer';
  const prepared = await prepareEmailOtp(normalizedEmail, accountType);

  if (prepared.error) {
    return prepared;
  }

  let error: Error | null = null;

  try {
    const result = await promiseWithTimeout(
      supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: accountType !== 'admin',
        },
      }),
      OTP_REQUEST_TIMEOUT_MS,
      'signInWithOtp'
    );

    error = result.error;
  } catch (requestError) {
    console.error('Email OTP request error:', requestError);
    return { error: new Error(''), errorCode: null };
  }

  if (error) {
    console.error('Email OTP request error:', error);
    return { error, errorCode: null };
  }

  return { error: null, errorCode: null };
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  accountType: AccountType = 'customer'
): Promise<VerifyEmailOtpResult> {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();

  let session: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data']['session'] = null;
  let error: Error | null = null;

  try {
    const result = await promiseWithTimeout(
      supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: 'email',
      }),
      OTP_VERIFY_TIMEOUT_MS,
      'verifyOtp'
    );

    session = result.data.session;
    error = result.error;
  } catch (verifyError) {
    console.error('Email OTP verification error:', verifyError);
    return { error: new Error(''), errorCode: null, redirectTo: null };
  }

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

  let response: Response;

  try {
    response = await fetchWithTimeout(
      '/api/auth/email-otp/complete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountType }),
      },
      OTP_COMPLETE_TIMEOUT_MS,
      'completeEmailOtp'
    );
  } catch (completeError) {
    console.error('Complete email OTP error:', completeError);

    if (accountType === 'customer') {
      return {
        error: null,
        errorCode: null,
        redirectTo: '/tour',
      };
    }

    await supabase.auth.signOut();
    return {
      error: new Error(''),
      errorCode: null,
      redirectTo: null,
    };
  }

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
