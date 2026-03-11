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
  customerAccessGranted?: boolean;
  customerAccessGrantedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  userRole: AppUserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  hasCustomerAccess: boolean;
  customerAccessGrantedAt: string | null;
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
  const [hasCustomerAccess, setHasCustomerAccess] = useState(false);
  const [customerAccessGrantedAt, setCustomerAccessGrantedAt] = useState<string | null>(null);
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

  const fetchRoleFromApi = useCallback(async (): Promise<MeResponse> => {
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

    return await response.json() as MeResponse;
  }, [withTimeout]);

  const checkUserRole = useCallback(async (currentUser: User | null) => {
    console.group('[AuthContext] checkUserRole');
    console.log('currentUser:', currentUser?.email ?? null, currentUser?.id ?? null);

    if (!currentUser?.email) {
      console.log('No current user email, reset role state');
      setUserRole(null);
      setIsAdmin(false);
      setHasCustomerAccess(false);
      setCustomerAccessGrantedAt(null);
      setIsRoleReady(true);
      console.groupEnd();
      return;
    }

    try {
      const me = await fetchRoleFromApi();
      console.log('role api result:', me.role, me.customerAccessGranted);
      setUserRole(me.role);
      setIsAdmin(me.role === 'admin');
      setHasCustomerAccess(me.role === 'customer' ? Boolean(me.customerAccessGranted) : true);
      setCustomerAccessGrantedAt(me.customerAccessGrantedAt ?? null);
      setIsRoleReady(true);
      console.log('resolved role:', me.role);
    } catch (error) {
      console.error('[AuthContext] checkUserRole failed, fallback to customer:', error);
      setUserRole('customer');
      setIsAdmin(false);
      setHasCustomerAccess(false);
      setCustomerAccessGrantedAt(null);
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
    setHasCustomerAccess(false);
    setCustomerAccessGrantedAt(null);
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
        hasCustomerAccess,
        customerAccessGrantedAt,
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
