'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isOwner, isAdmin, isLoading, isRoleReady, refreshUserRole } = useAuth();
  const refreshedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    if (refreshedUserIdRef.current === user.id) return;

    refreshedUserIdRef.current = user.id;

    refreshUserRole().catch(error => {
      console.error('[OwnerLayout] refreshUserRole failed:', error);
    });
  }, [user?.id, refreshUserRole]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?type=owner');
      return;
    }

    if (!isRoleReady) {
      return;
    }

    if (!isOwner && !isAdmin) {
      router.replace('/tour');
    }
  }, [isLoading, user, isOwner, isAdmin, isRoleReady, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (isLoading || (user && !isRoleReady) || (user && isRoleReady && !isOwner && !isAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#2c1e16]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">FlavorQuest Owner</h1>
            <p className="text-xs text-gray-400">Không gian quản lý chủ quán</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
