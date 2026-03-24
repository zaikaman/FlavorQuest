'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { requestEmailOtp, verifyEmailOtp, type AccountType } from '@/lib/services/auth';
import { primeSharedAudioElement } from '@/lib/services/audio-session';
import { InlineSpinner, Skeleton } from '@/components/ui/Loading';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isLoading,
    isAdmin,
    isOwner,
    isPendingOwner,
    isRoleReady,
    ownerRequestStatus,
    refreshUserRole,
  } = useAuth();
  const { t } = useTranslations();
  const error = searchParams.get('error');
  const accountType = (searchParams.get('type') === 'owner' ? 'owner' : 'customer') as Extract<
    AccountType,
    'customer' | 'owner'
  >;
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [lastSentEmail, setLastSentEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCompletingOwnerLogin, setIsCompletingOwnerLogin] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isResendLocked = cooldown > 0 && normalizedEmail === lastSentEmail;
  const activeFeedback =
    feedback ??
    (error === 'auth_failed' ? { type: 'error' as const, message: t('login.error') } : null);

  useEffect(() => {
    if (!isLoading && user && isRoleReady) {
      if (isAdmin) {
        router.push('/admin');
        return;
      }

      if (isOwner) {
        router.push('/owner');
        return;
      }

      if (isPendingOwner) {
        router.push('/pending-owner');
        return;
      }

      if (
        accountType === 'owner' &&
        (ownerRequestStatus === 'pending' || ownerRequestStatus === 'rejected')
      ) {
        router.push('/pending-owner');
        return;
      }

      if (
        accountType === 'owner' &&
        isCompletingOwnerLogin &&
        ownerRequestStatus === null
      ) {
        return;
      }

      router.push('/tour');
    }
  }, [
    accountType,
    isAdmin,
    isCompletingOwnerLogin,
    isLoading,
    isOwner,
    isPendingOwner,
    isRoleReady,
    ownerRequestStatus,
    router,
    user,
  ]);

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
      setFeedback({ type: 'error', message: t('login.invalidEmail') });
      return;
    }

    setIsSendingOtp(true);
    setFeedback(null);

    try {
      const { error: requestError, errorCode } = await requestEmailOtp(normalizedEmail, {
        accountType,
      });

      if (requestError) {
        const message =
          errorCode === 'ADMIN_PORTAL_REQUIRED'
            ? t('login.adminPortalRequired')
            : requestError.message || t('login.sendOtpError');
        setFeedback({ type: 'error', message });
        return;
      }

      setLastSentEmail(normalizedEmail);
      setIsOtpSent(true);
      setCooldown(60);
      setFeedback({ type: 'success', message: t('login.codeSentTo', { email: normalizedEmail }) });
    } catch (error) {
      console.error('[LoginPage] requestEmailOtp failed:', error);
      setFeedback({ type: 'error', message: t('login.sendOtpError') });
    } finally {
      setIsSendingOtp(false);
    }
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
    if (accountType === 'owner') {
      setIsCompletingOwnerLogin(true);
    }
    setFeedback(null);

    try {
      void primeSharedAudioElement();

      const {
        error: verifyError,
        errorCode,
        redirectTo,
      } = await verifyEmailOtp(normalizedEmail, otp, accountType);

      if (verifyError) {
        setIsCompletingOwnerLogin(false);
        const message =
          errorCode === 'ADMIN_PORTAL_REQUIRED'
            ? t('login.adminPortalRequired')
            : verifyError.message || t('login.verifyOtpError');
        setFeedback({ type: 'error', message });
        return;
      }

      const destination = redirectTo ?? (accountType === 'owner' ? '/pending-owner' : '/tour');
      router.push(destination);
      router.refresh();
      refreshUserRole().catch((refreshError) => {
        console.warn('[LoginPage] refreshUserRole failed after OTP verify:', refreshError);
      });
    } catch (error) {
      console.error('[LoginPage] verifyEmailOtp failed:', error);
      setIsCompletingOwnerLogin(false);
      setFeedback({ type: 'error', message: t('login.verifyOtpError') });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background-dark min-h-screen px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-8 w-2/3" />
            <Skeleton className="mx-auto mt-3 h-4 w-4/5 rounded-full" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
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
    <div className="bg-background-dark font-display relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 select-none">
        <div
          className="h-full w-full bg-cover bg-center object-cover opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1td4WSx6nl5TKAIPQHvb3mXshqreYAsVVo5NGNLo4nkeSZVy-c4WPWG5TBcBOnTUczh9Q4wjij1A12mpRZrc-ME4sJthwOil3ubDdHgHAPCiXAM-77eCwcoDOIozkEpSVKWANT49fnbkrsEeUQ6qRhE7Cjs7ecrqz_iS4B9ha0zKruboEGSrVxELdqF2B3ohGZZ99cp-OG1iRCCZ4t-cqTc7bQjxoV9kFzigSrAi2XDwsssfntyMkvmsUooxLreHQfcjVYlaTnbaN')",
          }}
        />
        <div className="from-background-dark/80 via-background-dark/95 to-background-dark absolute inset-0 bg-gradient-to-b" />
      </div>

      <div className="animate-scaleIn relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="border-primary/20 bg-primary/10 mb-4 inline-block rounded-full border p-4 shadow-[0_0_15px_rgba(242,108,13,0.3)] backdrop-blur-sm">
            <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">
              restaurant
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            {t('login.title')}
          </h1>
          <p className="font-medium text-gray-400">{t('login.subtitle')}</p>
        </div>

        {activeFeedback && (
          <div
            className={`mb-6 rounded-xl border p-4 backdrop-blur-md ${
              activeFeedback.type === 'error'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <p
              className={`flex items-center justify-center gap-2 text-center text-sm font-medium ${
                activeFeedback.type === 'error' ? 'text-red-400' : 'text-emerald-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {activeFeedback.type === 'error' ? 'error' : 'mark_email_read'}
              </span>
              {activeFeedback.message}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-300">{t('login.prompt')}</p>
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

            <p className="text-center text-xs text-gray-500">
              {t('login.selectedType', {
                type: accountType === 'owner' ? t('login.owner') : t('login.customer'),
              })}
            </p>

            {accountType === 'owner' && (
              <div className="border-primary/20 bg-primary/10 rounded-2xl border px-4 py-3 text-sm leading-6 text-orange-100">
                {t(
                  'login.ownerApprovalNote',
                  undefined,
                  'Đăng nhập chủ quán cần admin xác minh trước. Sau khi gửi OTP thành công, bạn sẽ được chuyển sang trang chờ duyệt và chat trực tiếp với admin.'
                )}
              </div>
            )}

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
                className="focus:border-primary w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors outline-none placeholder:text-gray-500"
                autoComplete="email"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isResendLocked}
                className="bg-primary w-full rounded-xl px-6 py-3 font-bold text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? (
                  <InlineSpinner label={t('login.sendingOtp')} />
                ) : isOtpSent ? (
                  isResendLocked ? (
                    t('login.resendIn', { seconds: cooldown })
                  ) : (
                    t('login.resendOtp')
                  )
                ) : (
                  t('login.sendOtp')
                )}
              </button>
              <p className="text-center text-xs text-gray-500">{t('login.changeEmailHint')}</p>
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
                  className="bg-background-dark/70 focus:border-primary w-full rounded-xl border border-white/10 px-4 py-3 text-center text-xl tracking-[0.4em] text-white transition-colors outline-none placeholder:tracking-normal placeholder:text-gray-500"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 w-full rounded-xl border px-6 py-3 font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? (
                    <InlineSpinner label={t('login.verifyingOtp')} color="primary" />
                  ) : (
                    t('login.verifyOtp')
                  )}
                </button>
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-transparent px-4 font-medium text-gray-500">
                  {t('login.or')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-primary hover:border-primary/20 hover:bg-primary/10 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-6 py-3 font-bold transition-all duration-200"
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
