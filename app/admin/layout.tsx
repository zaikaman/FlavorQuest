'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Be_Vietnam_Pro } from 'next/font/google';
import { usePathname, useRouter } from 'next/navigation';
import { RoleChatbot } from '@/components/ai/RoleChatbot';
import { useAuth } from '@/lib/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Loading';

const adminSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

function LoadingScreen() {
  return (
    <div className="bg-background-dark min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <DashboardSkeleton stats={6} />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    isAdmin,
    isOwner,
    isPendingOwner,
    isLoading,
    isRoleReady,
    hasCustomerAccess,
    refreshUserRole,
  } = useAuth();
  const refreshedUserIdRef = useRef<string | null>(null);
  const isAdminLoginPage = pathname === '/admin/login';

  const navItems = [
    { href: '/admin', label: 'Tổng quan' },
    { href: '/admin/chat', label: 'Tin nhắn' },
    { href: '/admin/owner-requests', label: 'Duyệt owner' },
    { href: '/admin/pois', label: 'POI' },
    { href: '/admin/users', label: 'Người dùng' },
    { href: '/admin/tours', label: 'Tour' },
    { href: '/admin/analytics', label: 'Phân tích' },
    { href: '/admin/payments', label: 'Thanh toán' },
  ];

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (refreshedUserIdRef.current === user.id) {
      return;
    }

    refreshedUserIdRef.current = user.id;

    refreshUserRole().catch((error) => {
      console.error('[AdminLayout] refreshUserRole failed:', error);
    });
  }, [refreshUserRole, user?.id]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      if (!isAdminLoginPage) {
        router.replace('/admin/login');
      }
      return;
    }

    if (!isRoleReady) {
      return;
    }

    if (isAdmin) {
      if (isAdminLoginPage) {
        router.replace('/admin');
      }
      return;
    }

    if (isOwner) {
      router.replace('/owner');
      return;
    }

    if (isPendingOwner) {
      router.replace('/pending-owner');
      return;
    }

    router.replace(hasCustomerAccess ? '/tour' : '/paywall');
  }, [hasCustomerAccess, isAdmin, isAdminLoginPage, isLoading, isOwner, isPendingOwner, isRoleReady, router, user]);

  if (isLoading || (user && !isRoleReady)) {
    return <LoadingScreen />;
  }

  if (isAdminLoginPage) {
    return (
      <div className={`${adminSans.className} bg-background-dark min-h-screen text-white`}>
        <div className="pointer-events-none fixed inset-0 bg-[url('/img/noise.png')] opacity-5" />
        {children}
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className={`${adminSans.className} bg-background-dark relative min-h-screen`}>
      <div className="pointer-events-none fixed inset-0 bg-[url('/img/noise.png')] opacity-5" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#2c1e16]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 py-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 rounded-lg p-2">
                <svg
                  className="text-primary h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Quản trị FlavorQuest</h1>
                <p className="text-xs text-gray-400">Quản lý nội dung</p>
              </div>
            </div>

            <nav className="min-w-0 overflow-x-auto [scrollbar-width:none] xl:px-4 [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max flex-nowrap items-center gap-1.5 xl:justify-center">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
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

            <div className="flex items-center justify-between gap-3 xl:justify-end">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-medium text-gray-200">{user.email}</p>
                <p className="text-primary text-xs font-semibold">Quản trị viên</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const { signOut } = await import('@/lib/services/auth');
                  await signOut();
                  router.push('/admin/login');
                }}
                className="rounded-lg border border-transparent px-3 py-2 text-sm text-gray-300 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-white"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <RoleChatbot
        role="admin"
        bottomOffsetClassName="bottom-4 sm:bottom-6 lg:bottom-8"
        pageContext={{ pathname }}
      />
    </div>
  );
}
