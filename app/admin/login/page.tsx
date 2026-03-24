'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InlineSpinner, Skeleton } from '@/components/ui/Loading';
import { useAuth } from '@/lib/contexts/AuthContext';
import { requestEmailOtp, verifyEmailOtp } from '@/lib/services/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading, isAdmin, isOwner, isRoleReady, refreshUserRole } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [lastSentEmail, setLastSentEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isResendLocked = cooldown > 0 && normalizedEmail === lastSentEmail;

  useEffect(() => {
    if (!isLoading && user && isRoleReady) {
      if (isAdmin) {
        router.replace('/admin');
        return;
      }

      if (isOwner) {
        router.replace('/owner');
        return;
      }

      router.replace('/tour');
    }
  }, [isAdmin, isLoading, isOwner, isRoleReady, router, user]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập email hợp lệ.' });
      return;
    }

    setIsSendingOtp(true);
    setFeedback(null);

    const { error, errorCode } = await requestEmailOtp(normalizedEmail, { accountType: 'admin' });

    setIsSendingOtp(false);

    if (error) {
      setFeedback({
        type: 'error',
        message:
          errorCode === 'ADMIN_ONLY_PORTAL'
            ? 'Email này không có quyền quản trị.'
            : error.message || 'Không thể gửi mã OTP cho cổng quản trị lúc này.',
      });
      return;
    }

    setLastSentEmail(normalizedEmail);
    setIsOtpSent(true);
    setCooldown(60);
    setFeedback({
      type: 'success',
      message: `Đã gửi mã OTP tới ${normalizedEmail}.`,
    });
  };

  const handleVerifyOtp = async () => {
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập email hợp lệ.' });
      return;
    }

    if (!otp.trim() || otp.trim().length < 6) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập mã OTP gồm 6 số.' });
      return;
    }

    setIsVerifyingOtp(true);
    setFeedback(null);

    const { error, errorCode, redirectTo } = await verifyEmailOtp(normalizedEmail, otp, 'admin');

    setIsVerifyingOtp(false);

    if (error) {
      setFeedback({
        type: 'error',
        message:
          errorCode === 'ADMIN_ONLY_PORTAL'
            ? 'Email này không có quyền quản trị.'
            : error.message || 'Không thể hoàn tất đăng nhập quản trị.',
      });
      return;
    }

    router.push(redirectTo ?? '/admin');
    router.refresh();
    refreshUserRole().catch((refreshError) => {
      console.warn('[AdminLoginPage] refreshUserRole failed after OTP verify:', refreshError);
    });
  };

  if (isLoading || (user && !isRoleReady)) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-8 w-2/3" />
            <Skeleton className="mx-auto mt-3 h-4 w-4/5 rounded-full" />
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="mt-6 h-11 w-full rounded-xl" />
            <Skeleton className="mt-3 h-11 w-full rounded-xl" />
            <Skeleton className="mt-6 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (user && isRoleReady) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <InlineSpinner label="" />
            </div>
            <h1 className="mt-6 text-2xl font-black text-white">Đang đưa bạn vào khu quản trị</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Phiên đăng nhập đã sẵn sàng. Hệ thống đang hoàn tất điều hướng.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="mt-6 h-11 w-full rounded-xl" />
            <Skeleton className="mt-3 h-11 w-full rounded-xl" />
            <Skeleton className="mt-6 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-[38%] w-[38%] rounded-full bg-primary/18 blur-[120px]" />
        <div className="absolute bottom-[4%] right-[-8%] h-[30%] w-[30%] rounded-full bg-[#f8d3a5]/10 blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-primary/20 bg-primary/10 shadow-[0_0_24px_rgba(242,108,13,0.22)]">
            <span className="material-symbols-outlined text-primary text-[40px]">shield_lock</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Cổng quản trị</p>
          <h1 className="mt-3 text-3xl font-black text-white">Đăng nhập quản trị</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Dành riêng cho tài khoản quản trị. Email không có quyền quản trị sẽ không thể vào khu vực này.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm backdrop-blur-md ${
              feedback.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-100'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16]/88 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
              <p className="text-sm leading-6 text-gray-300">
                Nhập email quản trị để nhận mã OTP. Khu vực này không dùng chung với cổng khách hàng hoặc chủ quán.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white" htmlFor="admin-email">
                Email quản trị
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-primary/50"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isResendLocked}
                className="w-full rounded-2xl bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? (
                  <InlineSpinner label="Đang gửi mã..." />
                ) : isOtpSent ? (
                  isResendLocked ? (
                    `Gửi lại sau ${cooldown}s`
                  ) : (
                    'Gửi lại mã OTP'
                  )
                ) : (
                  'Gửi mã OTP'
                )}
              </button>
            </div>

            {isOtpSent && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="text-center text-sm text-gray-300">
                  <p>Mã OTP đã được gửi tới email quản trị.</p>
                  <p className="mt-1 text-xs text-gray-500">{lastSentEmail}</p>
                </div>
                <label className="block text-sm font-semibold text-white" htmlFor="admin-otp">
                  Mã OTP
                </label>
                <input
                  id="admin-otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="w-full rounded-2xl border border-white/10 bg-[#17100b] px-4 py-3 text-center text-xl tracking-[0.4em] text-white outline-none transition-colors placeholder:tracking-normal placeholder:text-gray-500 focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full rounded-2xl border border-primary/30 bg-primary/15 px-6 py-3 font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? (
                    <InlineSpinner label="Đang xác thực..." color="primary" />
                  ) : (
                    'Xác nhận và vào khu quản trị'
                  )}
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm leading-6 text-gray-400">
              Nếu bạn là khách hàng hoặc chủ quán, hãy quay về cổng đăng nhập chính.
            </div>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Về đăng nhập chung</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
