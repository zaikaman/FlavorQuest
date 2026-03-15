'use client';

import { Be_Vietnam_Pro } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleChatbot } from '@/components/ai/RoleChatbot';
import { DashboardSkeleton } from '@/components/ui/Loading';
import { useAuth } from '@/lib/contexts/AuthContext';

const ownerSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

function OwnerLoadingShell() {
  return (
    <div className={`${ownerSans.className} bg-background-dark min-h-screen text-white`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardSkeleton stats={4} />
      </div>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    isOwner,
    isAdmin,
    isPendingOwner,
    isLoading,
    isRoleReady,
    refreshUserRole,
    signOut,
  } = useAuth();
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
      router.replace(isPendingOwner ? '/pending-owner' : '/tour');
    }
  }, [isAdmin, isLoading, isOwner, isPendingOwner, isRoleReady, router, user]);

  if (isLoading || (user && !isRoleReady)) {
    return <OwnerLoadingShell />;
  }

  if (!user || (!isOwner && !isAdmin)) {
    return null;
  }

  return (
    <div className={`${ownerSans.className} bg-background-dark relative min-h-screen text-white`}>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.18) 0.8px, transparent 0.8px)',
          backgroundSize: '18px 18px',
        }}
      />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#2c1e16]/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 py-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 text-primary border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border">
                <span className="material-symbols-outlined text-[26px]">storefront</span>
              </div>
              <div>
                <p className="text-primary/80 text-[11px] font-semibold tracking-[0.28em] uppercase">
                  Khu vực chủ quán
                </p>
                <h1 className="text-xl font-black text-white">Bảng điều hành chủ quán</h1>
                <p className="text-sm text-gray-400">
                  Theo dõi POI, món ăn, đơn đặt trước và tín hiệu vận hành trong một nơi.
                </p>
              </div>
            </div>

            <nav className="min-w-0 overflow-x-auto xl:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max flex-nowrap items-center gap-1.5 xl:justify-center">
                {[
                  { href: '/owner', label: 'Tổng quan' },
                  { href: '/owner/chat', label: 'Tin nhắn' },
                ].map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/owner' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
              <div className="hidden rounded-2xl border border-white/10 bg-black/15 px-4 py-2 text-right lg:block">
                <p className="text-sm font-semibold text-gray-100">{user.email}</p>
                <p className="text-primary text-xs font-semibold">
                  {isAdmin ? 'Quản trị viên kiêm chủ quán' : 'Tài khoản chủ quán'}
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
      <RoleChatbot
        role="owner"
        bottomOffsetClassName="bottom-4 sm:bottom-6 lg:bottom-8"
        pageContext={{ pathname }}
      />
    </div>
  );
}
