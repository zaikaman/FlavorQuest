/**
 * Auth Context
 * Quản lý authentication state globally
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type AppUserRole = 'customer' | 'owner' | 'admin';

interface AuthContextType {
  user: User | null;
  userRole: AppUserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  refreshUserRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      await checkUserRole(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      await checkUserRole(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (currentUser: User | null) => {
    const supabase = createClient();

    if (!currentUser?.email) {
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());
    if (adminList.includes(currentUser.email.toLowerCase())) {
      setUserRole('admin');
      setIsAdmin(true);
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    const role = data?.role === 'owner' ? 'owner' : 'customer';
    setUserRole(role);
    setIsAdmin(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
  };

  const refreshUserRole = async () => {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser ?? null);
    await checkUserRole(currentUser ?? null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isAdmin,
        isOwner: userRole === 'owner',
        isCustomer: userRole === 'customer',
        isLoading,
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
