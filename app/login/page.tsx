/**
 * Login Page
 * Google Sign In cho Admin
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/services/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!isLoading && user) {
      // Already logged in, always redirect to tour
      router.push('/tour');
    }
  }, [user, isLoading, router]);

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Sign in failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background-dark overflow-hidden font-display">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div
          className="w-full h-full bg-cover bg-center object-cover opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1td4WSx6nl5TKAIPQHvb3mXshqreYAsVVo5NGNLo4nkeSZVy-c4WPWG5TBcBOnTUczh9Q4wjij1A12mpRZrc-ME4sJthwOil3ubDdHgHAPCiXAM-77eCwcoDOIozkEpSVKWANT49fnbkrsEeUQ6qRhE7Cjs7ecrqz_iS4B9ha0zKruboEGSrVxELdqF2B3ohGZZ99cp-OG1iRCCZ4t-cqTc7bQjxoV9kFzigSrAi2XDwsssfntyMkvmsUooxLreHQfcjVYlaTnbaN')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-background-dark/95 to-background-dark"></div>
      </div>

      <div className="relative z-10 max-w-md w-full px-4 animate-scaleIn">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-primary/10 rounded-full shadow-[0_0_15px_rgba(242,108,13,0.3)] mb-4 border border-primary/20 backdrop-blur-sm">
            <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">restaurant</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">Đăng nhập FlavorQuest</h1>
          <p className="text-gray-400 font-medium">Lưu tiến độ và đồng bộ trải nghiệm của bạn</p>
        </div>

        {/* Error Message */}
        {error === 'auth_failed' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-md">
            <p className="text-red-400 text-sm text-center font-medium flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              Đăng nhập thất bại. Vui lòng thử lại.
            </p>
          </div>
        )}

        {/* Sign In Card */}
        <div className="bg-white/5 rounded-2xl shadow-2xl p-8 backdrop-blur-xl border border-white/10 ring-1 ring-black/5">
          <div className="space-y-6">
            {/* Info */}
            <div className="text-center">
              <p className="text-sm text-gray-300">
                Đăng nhập bằng tài khoản Google để tiếp tục
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="group w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500 font-medium">hoặc</span>
              </div>
            </div>

            {/* Back to Home */}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 text-primary font-bold py-3 px-6 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span>Quay lại trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
