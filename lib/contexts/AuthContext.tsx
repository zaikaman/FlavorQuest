/**
 * Auth Context
 * Quản lý authentication state globally
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, RealtimeChannel, User } from '@supabase/supabase-js';
import { USER_PRESENCE_CHANNEL, type UserPresencePayload } from '@/lib/realtime/presence';
import type { OwnerRequestStatus } from '@/lib/types';

type AppUserRole = 'customer' | 'pending-owner' | 'owner' | 'admin';
const ROLE_FETCH_TIMEOUT_MS = 5000;
const AUTH_SNAPSHOT_KEY = 'flavorquest-auth-snapshot';

interface MeResponse {
  id: string;
  email: string | null;
  role: AppUserRole;
  customerAccessGranted?: boolean;
  customerAccessGrantedAt?: string | null;
  ownerRequestStatus?: OwnerRequestStatus | null;
  ownerRequestedAt?: string | null;
  ownerReviewedAt?: string | null;
}

interface AuthSnapshot {
  userId: string;
  role: AppUserRole;
  hasCustomerAccess: boolean;
  customerAccessGrantedAt: string | null;
  ownerRequestStatus: OwnerRequestStatus | null;
  ownerRequestedAt: string | null;
  ownerReviewedAt: string | null;
  cachedAt: number;
}

interface AuthContextType {
  user: User | null;
  userRole: AppUserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isPendingOwner: boolean;
  hasCustomerAccess: boolean;
  customerAccessGrantedAt: string | null;
  ownerRequestStatus: OwnerRequestStatus | null;
  ownerRequestedAt: string | null;
  ownerReviewedAt: string | null;
  isLoading: boolean;
  isRoleReady: boolean;
  refreshUserRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadAuthSnapshot(userId: string | null): AuthSnapshot | null {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!rawSnapshot) {
      return null;
    }

    const snapshot = JSON.parse(rawSnapshot) as AuthSnapshot;
    return snapshot.userId === userId ? snapshot : null;
  } catch (error) {
    console.warn('[AuthContext] Failed to load auth snapshot:', error);
    return null;
  }
}

function saveAuthSnapshot(snapshot: AuthSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[AuthContext] Failed to save auth snapshot:', error);
  }
}

function clearAuthSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
  } catch (error) {
    console.warn('[AuthContext] Failed to clear auth snapshot:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseRef = useRef(createClient());
  const currentUserIdRef = useRef<string | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCustomerAccess, setHasCustomerAccess] = useState(false);
  const [customerAccessGrantedAt, setCustomerAccessGrantedAt] = useState<string | null>(null);
  const [ownerRequestStatus, setOwnerRequestStatus] = useState<OwnerRequestStatus | null>(null);
  const [ownerRequestedAt, setOwnerRequestedAt] = useState<string | null>(null);
  const [ownerReviewedAt, setOwnerReviewedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleReady, setIsRoleReady] = useState(false);

  const resetRoleState = useCallback((roleReady: boolean) => {
    setUserRole(null);
    setIsAdmin(false);
    setHasCustomerAccess(true);
    setCustomerAccessGrantedAt(null);
    setOwnerRequestStatus(null);
    setOwnerRequestedAt(null);
    setOwnerReviewedAt(null);
    setIsRoleReady(roleReady);
  }, []);

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

    return (await response.json()) as MeResponse;
  }, [withTimeout]);

  const checkUserRole = useCallback(
    async (currentUser: User | null) => {
      console.group('[AuthContext] checkUserRole');
      console.log('currentUser:', currentUser?.email ?? null, currentUser?.id ?? null);

      if (!currentUser?.email) {
        console.log('No current user email, reset role state');
        resetRoleState(true);
        console.groupEnd();
        return;
      }

      try {
        const me = await fetchRoleFromApi();
        console.log('role api result:', me.role, me.customerAccessGranted);
        setUserRole(me.role);
        setIsAdmin(me.role === 'admin');
        setHasCustomerAccess(me.role === 'customer' ? true : false);
        setCustomerAccessGrantedAt(me.customerAccessGrantedAt ?? null);
        setOwnerRequestStatus(me.ownerRequestStatus ?? null);
        setOwnerRequestedAt(me.ownerRequestedAt ?? null);
        setOwnerReviewedAt(me.ownerReviewedAt ?? null);
        saveAuthSnapshot({
          userId: currentUser.id,
          role: me.role,
          hasCustomerAccess: me.role === 'customer' ? true : false,
          customerAccessGrantedAt: me.customerAccessGrantedAt ?? null,
          ownerRequestStatus: me.ownerRequestStatus ?? null,
          ownerRequestedAt: me.ownerRequestedAt ?? null,
          ownerReviewedAt: me.ownerReviewedAt ?? null,
          cachedAt: Date.now(),
        });
        setIsRoleReady(true);
        console.log('resolved role:', me.role);
      } catch (error) {
        const cachedSnapshot = loadAuthSnapshot(currentUser.id);

        if (cachedSnapshot) {
          console.warn('[AuthContext] checkUserRole failed, using cached auth snapshot:', error);
          setUserRole(cachedSnapshot.role);
          setIsAdmin(cachedSnapshot.role === 'admin');
          setHasCustomerAccess(cachedSnapshot.hasCustomerAccess);
          setCustomerAccessGrantedAt(cachedSnapshot.customerAccessGrantedAt);
          setOwnerRequestStatus(cachedSnapshot.ownerRequestStatus);
          setOwnerRequestedAt(cachedSnapshot.ownerRequestedAt);
          setOwnerReviewedAt(cachedSnapshot.ownerReviewedAt);
        } else {
          console.error('[AuthContext] checkUserRole failed, fallback to customer:', error);
          setUserRole('customer');
          setIsAdmin(false);
          setHasCustomerAccess(true);
          setCustomerAccessGrantedAt(null);
          setOwnerRequestStatus(null);
          setOwnerRequestedAt(null);
          setOwnerReviewedAt(null);
        }

        setIsRoleReady(true);
      } finally {
        console.groupEnd();
      }
    },
    [fetchRoleFromApi, resetRoleState]
  );

  const syncAuthState = useCallback(
    async (event: AuthChangeEvent, nextUser: User | null) => {
      const previousUserId = currentUserIdRef.current;
      const nextUserId = nextUser?.id ?? null;
      const sameUser = previousUserId !== null && previousUserId === nextUserId;

      currentUserIdRef.current = nextUserId;
      setUser(nextUser);
      setIsLoading(false);

      if (!nextUser) {
        clearAuthSnapshot();
        resetRoleState(true);
        return;
      }

      // Keep the current UI stable when Supabase refreshes the token for the same user.
      if (
        sameUser &&
        (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED')
      ) {
        return;
      }

      setIsRoleReady(false);
      await checkUserRole(nextUser);
    },
    [checkUserRole, resetRoleState]
  );

  useEffect(() => {
    const supabase = supabaseRef.current;
    console.log('[AuthContext] init');
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) {
        return;
      }

      console.log('[AuthContext] initial session:', session?.user?.email ?? null);
      await syncAuthState('INITIAL_SESSION', session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      console.log('[AuthContext] auth state change:', _event, session?.user?.email ?? null);
      await syncAuthState(_event, session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    presenceChannelRef.current?.unsubscribe();
    presenceChannelRef.current = null;

    if (!user?.id) {
      return;
    }

    const channel = supabase.channel(USER_PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') {
        return;
      }

      const payload: UserPresencePayload = {
        userId: user.id,
        email: user.email ?? null,
        role: userRole ?? 'guest',
        lastSeenAt: new Date().toISOString(),
      };

      await channel.track(payload);
    });

    return () => {
      channel.unsubscribe();
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null;
      }
    };
  }, [user?.email, user?.id, userRole]);

  const handleSignOut = async () => {
    const supabase = supabaseRef.current;
    await presenceChannelRef.current?.unsubscribe();
    presenceChannelRef.current = null;
    await supabase.auth.signOut();
    currentUserIdRef.current = null;
    setUser(null);
    clearAuthSnapshot();
    resetRoleState(true);
  };

  const refreshUserRole = useCallback(async () => {
    const supabase = supabaseRef.current;
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
        isPendingOwner: userRole === 'pending-owner',
        hasCustomerAccess,
        customerAccessGrantedAt,
        ownerRequestStatus,
        ownerRequestedAt,
        ownerReviewedAt,
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
