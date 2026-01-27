/**
 * Admin Layout
 * Auth check middleware - chỉ admin mới truy cập được
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
      } else if (!isAdmin) {
        // Logged in but not admin, redirect to home
        router.push('/');
      }
    }
  }, [user, isAdmin, isLoading, router]);

  // Show loading state
  if (isLoading) {
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
  if (!user || !isAdmin) {
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
          <div className="flex justify-between items-center h-16">
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
