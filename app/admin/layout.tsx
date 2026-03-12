/**
 * Admin Layout
 * Auth check middleware - chỉ admin mới truy cập được
 */

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isLoading, isRoleReady, refreshUserRole } = useAuth();
  const refreshedUserIdRef = useRef<string | null>(null);

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/pois', label: 'POI' },
    { href: '/admin/tours', label: 'Tours' },
    { href: '/admin/analytics', label: 'Analytics' },
    { href: '/admin/payments', label: 'Thanh toán' },
  ];

  useEffect(() => {
    if (!user?.id) return;
    if (refreshedUserIdRef.current === user.id) return;

    refreshedUserIdRef.current = user.id;

    refreshUserRole().catch(error => {
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
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!user || !isRoleReady || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">Truy cập bị từ chối</h1>
          <p className="text-gray-400 mb-6">Bạn không có quyền truy cập Admin Panel.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Render admin content
  return (
    <div className="min-h-screen bg-background-dark relative">
      <div className="fixed inset-0 bg-[url('/img/noise.png')] opacity-5 pointer-events-none"></div>

      {/* Admin Header */}
      <header className="bg-[#2c1e16]/80 border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">FlavorQuest Admin</h1>
                <p className="text-xs text-gray-400">Quản lý nội dung</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map(item => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

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
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-200">{user.email}</p>
                <p className="text-xs text-primary font-semibold">Admin</p>
              </div>
              <button
                onClick={async () => {
                  const { signOut } = await import('@/lib/services/auth');
                  await signOut();
                  router.push('/login');
                }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
