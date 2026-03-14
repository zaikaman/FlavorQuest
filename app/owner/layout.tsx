'use client';

import { Be_Vietnam_Pro } from 'next/font/google';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

const ownerSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isOwner, isAdmin, isLoading, isRoleReady, refreshUserRole, signOut } = useAuth();
  const refreshedUserIdRef = useRef<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.replace('/login?type=owner');
      router.refresh();
    } catch (error) {
      console.error('[OwnerLayout] signOut failed:', error);
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (refreshedUserIdRef.current === user.id) return;

    refreshedUserIdRef.current = user.id;

    refreshUserRole().catch((error) => {
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
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2" />
          <p className="mt-4 text-sm text-gray-400">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (isLoading || (user && !isRoleReady) || (user && isRoleReady && !isOwner && !isAdmin)) {
    return null;
  }

  return (
    <div className={`${ownerSans.className} bg-background-dark relative min-h-screen text-white`}>
      <div className="pointer-events-none fixed inset-0 bg-[url('/img/noise.png')] opacity-5" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#2c1e16]/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 text-primary border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border">
                <span className="material-symbols-outlined text-[26px]">storefront</span>
              </div>
              <div>
                <p className="text-primary/80 text-[11px] font-semibold tracking-[0.28em] uppercase">
                  Owner space
                </p>
                <h1 className="text-xl font-black text-white">Bảng điều hành chủ quán</h1>
                <p className="text-sm text-gray-400">
                  Theo dõi POI, món ăn, đơn đặt trước và tín hiệu vận hành trong một nơi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-2 text-right">
                <p className="text-sm font-semibold text-gray-100">{user?.email}</p>
                <p className="text-primary text-xs font-semibold">
                  {isAdmin ? 'Admin kiêm chủ quán' : 'Tài khoản chủ quán'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>{isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
