/**
 * Admin Layout
 * Auth check middleware - chỉ admin mới truy cập được
 */

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Be_Vietnam_Pro } from 'next/font/google';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

const adminSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isLoading, isRoleReady, refreshUserRole } = useAuth();
  const refreshedUserIdRef = useRef<string | null>(null);

  const navItems = [
    { href: '/admin', label: 'Tổng quan' },
    { href: '/admin/pois', label: 'POI' },
    { href: '/admin/users', label: 'Người dùng' },
    { href: '/admin/tours', label: 'Tour' },
    { href: '/admin/analytics', label: 'Phân tích' },
    { href: '/admin/payments', label: 'Thanh toán' },
  ];

  useEffect(() => {
    if (!user?.id) return;
    if (refreshedUserIdRef.current === user.id) return;

    refreshedUserIdRef.current = user.id;

    refreshUserRole().catch((error) => {
      console.error('[AdminLayout] refreshUserRole failed:', error);
    });
  }, [user?.id, refreshUserRole]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isRoleReady) {
      return;
    }

    if (!isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, isLoading, isRoleReady, router]);

  // Show loading state
  if (isLoading || (user && !isRoleReady)) {
    return (
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-gray-400">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!user || !isRoleReady || !isAdmin) {
    return (
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <div className="mb-4 text-6xl">🚫</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Truy cập bị từ chối</h1>
          <p className="mb-6 text-gray-400">Bạn không có quyền truy cập trang quản trị.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary rounded-lg px-6 py-2 font-medium text-white transition-colors hover:bg-orange-600"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Render admin content
  return (
    <div className={`${adminSans.className} bg-background-dark relative min-h-screen`}>
      <div className="pointer-events-none fixed inset-0 bg-[url('/img/noise.png')] opacity-5"></div>

      {/* Admin Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#2c1e16]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
            {/* Logo & Title */}
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

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Sign Out */}
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-200">{user.email}</p>
                <p className="text-primary text-xs font-semibold">Quản trị viên</p>
              </div>
              <button
                onClick={async () => {
                  const { signOut } = await import('@/lib/services/auth');
                  await signOut();
                  router.push('/login');
                }}
                className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-white"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
