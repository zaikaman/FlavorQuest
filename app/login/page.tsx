/**
 * Login Page
 * Đăng nhập bằng email + OTP
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { requestEmailOtp, verifyEmailOtp, type AccountType } from '@/lib/services/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isOwner, isRoleReady, hasCustomerAccess, refreshUserRole } = useAuth();
  const { t } = useTranslations();
  const error = searchParams.get('error');
  const accountType = (searchParams.get('type') === 'owner' ? 'owner' : 'customer') as AccountType;
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
  const activeFeedback = feedback ?? (error === 'auth_failed'
    ? { type: 'error' as const, message: t('login.error') }
    : null);

  useEffect(() => {
    if (!isLoading && user && isRoleReady) {
      // Ưu tiên loại tài khoản đã chọn trên màn hình login.
      // Điều này giúp tài khoản admin vẫn có thể vào luồng chủ quán khi chọn "Chủ quán".
      router.push(accountType === 'owner' || isOwner ? '/owner' : hasCustomerAccess ? '/tour' : '/paywall');
    }
  }, [user, isLoading, isOwner, isRoleReady, hasCustomerAccess, accountType, router]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown(current => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFeedback({ type: 'error', message: t('login.invalidEmail') });
      return;
    }

    setIsSendingOtp(true);
    setFeedback(null);

    const { error: requestError } = await requestEmailOtp(normalizedEmail);

    setIsSendingOtp(false);

    if (requestError) {
      setFeedback({ type: 'error', message: requestError.message || t('login.sendOtpError') });
      return;
    }

    setLastSentEmail(normalizedEmail);
    setIsOtpSent(true);
    setCooldown(60);
    setFeedback({ type: 'success', message: t('login.codeSentTo', { email: normalizedEmail }) });
  };

  const handleVerifyOtp = async () => {
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFeedback({ type: 'error', message: t('login.invalidEmail') });
      return;
    }

    if (!otp.trim() || otp.trim().length < 6) {
      setFeedback({ type: 'error', message: t('login.invalidOtp') });
      return;
    }

    setIsVerifyingOtp(true);
    setFeedback(null);

    const { error: verifyError, redirectTo } = await verifyEmailOtp(normalizedEmail, otp, accountType);

    setIsVerifyingOtp(false);

    if (verifyError) {
      setFeedback({ type: 'error', message: verifyError.message || t('login.verifyOtpError') });
      return;
    }

    await refreshUserRole();
    router.push(redirectTo ?? (accountType === 'owner' ? '/owner' : '/tour'));
    router.refresh();
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
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">{t('login.title')}</h1>
          <p className="text-gray-400 font-medium">{t('login.subtitle')}</p>
        </div>

        {/* Feedback Message */}
        {activeFeedback && (
          <div className={`mb-6 rounded-xl border p-4 backdrop-blur-md ${
            activeFeedback.type === 'error'
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}>
            <p className={`flex items-center justify-center gap-2 text-center text-sm font-medium ${
              activeFeedback.type === 'error' ? 'text-red-400' : 'text-emerald-300'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {activeFeedback.type === 'error' ? 'error' : 'mark_email_read'}
              </span>
              {activeFeedback.message}
            </p>
          </div>
        )}

        {/* Sign In Card */}
        <div className="bg-white/5 rounded-2xl shadow-2xl p-8 backdrop-blur-xl border border-white/10 ring-1 ring-black/5">
          <div className="space-y-6">
            {/* Info */}
            <div className="text-center">
              <p className="text-sm text-gray-300">
                {t('login.prompt')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push('/login?type=customer')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  accountType === 'customer'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {t('login.customer')}
              </button>
              <button
                type="button"
                onClick={() => router.push('/login?type=owner')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  accountType === 'owner'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {t('login.owner')}
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">{t('login.selectedType', { type: accountType === 'owner' ? t('login.owner') : t('login.customer') })}</p>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white" htmlFor="email">
                {t('login.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-primary"
                autoComplete="email"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isResendLocked}
                className="w-full rounded-xl bg-primary px-6 py-3 font-bold text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp
                  ? t('login.sendingOtp')
                  : isOtpSent
                    ? isResendLocked
                      ? t('login.resendIn', { seconds: cooldown })
                      : t('login.resendOtp')
                    : t('login.sendOtp')}
              </button>
              <p className="text-xs text-center text-gray-500">{t('login.changeEmailHint')}</p>
            </div>

            {isOtpSent && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-center text-sm text-gray-300">
                  <p>{t('login.codeSent')}</p>
                  <p className="mt-1 text-xs text-gray-500">{lastSentEmail}</p>
                </div>
                <label className="block text-sm font-semibold text-white" htmlFor="otp">
                  {t('login.otpLabel')}
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('login.otpPlaceholder')}
                  className="w-full rounded-xl border border-white/10 bg-background-dark/70 px-4 py-3 text-center text-xl tracking-[0.4em] text-white outline-none transition-colors placeholder:tracking-normal placeholder:text-gray-500 focus:border-primary"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full rounded-xl border border-primary/30 bg-primary/15 px-6 py-3 font-bold text-primary transition-all duration-200 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? t('login.verifyingOtp') : t('login.verifyOtp')}
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500 font-medium">{t('login.or')}</span>
              </div>
            </div>

            {/* Back to Home */}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 text-primary font-bold py-3 px-6 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span>{t('login.backToHome')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
