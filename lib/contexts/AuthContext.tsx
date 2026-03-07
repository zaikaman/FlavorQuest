/**
 * Auth Context
 * Quản lý authentication state globally
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type AppUserRole = 'customer' | 'owner' | 'admin';
const ROLE_FETCH_TIMEOUT_MS = 5000;

interface MeResponse {
  id: string;
  email: string | null;
  role: AppUserRole;
}

interface AuthContextType {
  user: User | null;
  userRole: AppUserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  isRoleReady: boolean;
  refreshUserRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleReady, setIsRoleReady] = useState(false);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, label: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${ROLE_FETCH_TIMEOUT_MS}ms`));
        }, ROLE_FETCH_TIMEOUT_MS);
      }),
    ]);
  }, []);

  const fetchRoleFromApi = useCallback(async (): Promise<AppUserRole | null> => {
    const response = await withTimeout(
      fetch(`/api/users/me?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      }),
      'fetch user role via /api/users/me'
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`/api/users/me -> ${response.status}: ${errorText}`);
    }

    const data = await response.json() as MeResponse;
    return data.role;
  }, [withTimeout]);

  const checkUserRole = useCallback(async (currentUser: User | null) => {
    console.group('[AuthContext] checkUserRole');
    console.log('currentUser:', currentUser?.email ?? null, currentUser?.id ?? null);

    if (!currentUser?.email) {
      console.log('No current user email, reset role state');
      setUserRole(null);
      setIsAdmin(false);
      setIsRoleReady(true);
      console.groupEnd();
      return;
    }

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());
    if (adminList.includes(currentUser.email.toLowerCase())) {
      console.log('Matched admin via env list');
      setUserRole('admin');
      setIsAdmin(true);
      setIsRoleReady(true);
      console.groupEnd();
      return;
    }

    try {
      const role = await fetchRoleFromApi();
      console.log('role api result:', role);
      setUserRole(role);
      setIsAdmin(role === 'admin');
      setIsRoleReady(true);
      console.log('resolved role:', role);
    } catch (error) {
      console.error('[AuthContext] checkUserRole failed, fallback to customer:', error);
      setUserRole('customer');
      setIsAdmin(false);
      setIsRoleReady(true);
    } finally {
      console.groupEnd();
    }
  }, [fetchRoleFromApi]);

  useEffect(() => {
    const supabase = createClient();
    console.log('[AuthContext] init');

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] initial session:', session?.user?.email ?? null);
      setUser(session?.user ?? null);
      setIsRoleReady(false);
      setIsLoading(false);
      await checkUserRole(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] auth state change:', _event, session?.user?.email ?? null);
      setUser(session?.user ?? null);
      setIsRoleReady(false);
      setIsLoading(false);
      await checkUserRole(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [checkUserRole]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
    setIsRoleReady(true);
  };

  const refreshUserRole = useCallback(async () => {
    const supabase = createClient();
    console.log('[AuthContext] refreshUserRole');
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    await checkUserRole(currentUser ?? null);
  }, [checkUserRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isAdmin,
        isOwner: userRole === 'owner',
        isCustomer: userRole === 'customer',
        isLoading,
        isRoleReady,
        refreshUserRole,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
