'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { DashboardSkeleton, InlineSpinner } from '@/components/ui/Loading';

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';

interface CustomerAccessPayment {
  id: string;
  user_id: string;
  order_code: number;
  payment_link_id: string | null;
  amount: number;
  status: PaymentStatus;
  checkout_url: string | null;
  qr_code: string | null;
  description: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StatusResponse {
  hasAccess: boolean;
  customerAccessGrantedAt: string | null;
  payment: CustomerAccessPayment | null;
}

export default function PaywallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations();
  const {
    user,
    isLoading,
    isRoleReady,
    isOwner,
    isAdmin,
    isPendingOwner,
    hasCustomerAccess,
    refreshUserRole,
  } = useAuth();

  const [payment, setPayment] = useState<CustomerAccessPayment | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCompletingAccess, setIsCompletingAccess] = useState(false);
  const [isStatusUnauthorized, setIsStatusUnauthorized] = useState(false);

  const localizedPaymentStatus = useCallback((status: PaymentStatus) => {
    return t(`paywall.statuses.${status}`);
  }, [t]);

  const openHostedCheckout = useCallback((checkoutUrl: string) => {
    try {
      const normalizedCheckoutUrl = new URL(checkoutUrl).toString();
      setStatusMessage(t('paywall.messages.openingHosted'));
      window.location.assign(normalizedCheckoutUrl);
    } catch (error) {
      console.error('[Paywall] invalid payOS url:', error);
      setStatusMessage(t('paywall.messages.invalidCheckoutLink'));
    }
  }, [t]);

  const orderCodeFromQuery = useMemo(() => {
    const raw = searchParams.get('orderCode');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const refreshStatus = useCallback(async (orderCode?: number | null, force = true) => {
    if (isStatusUnauthorized) {
      return;
    }

    setIsChecking(true);

    try {
      const params = new URLSearchParams();
      if (orderCode) {
        params.set('orderCode', String(orderCode));
      }
      if (!force) {
        params.set('refresh', '0');
      }

      const response = await fetch(`/api/payments/customer-access/status?${params.toString()}`, {
        cache: 'no-store',
      });

      if (response.status === 401) {
        setIsStatusUnauthorized(true);
        setPayment(null);
        setStatusMessage(t('paywall.messages.unauthorized'));
        return;
      }

      if (!response.ok) {
        throw new Error('Không thể kiểm tra trạng thái thanh toán');
      }

      const result = await response.json() as StatusResponse;
      setIsStatusUnauthorized(false);
      setPayment(result.payment);

      if (result.hasAccess) {
        setStatusMessage(t('paywall.messages.accessGranted'));
        setIsCompletingAccess(true);
        await refreshUserRole();
        router.replace(orderCode ? `/paywall/success?orderCode=${orderCode}` : '/paywall/success');
        return;
      }

      if (result.payment?.status === 'CANCELLED') {
        setStatusMessage(t('paywall.messages.cancelled'));
      } else if (result.payment?.status === 'EXPIRED') {
        setStatusMessage(t('paywall.messages.expired'));
      } else if (result.payment?.status === 'PAID') {
        setStatusMessage(t('paywall.messages.paidSyncing'));
      } else if (result.payment?.status) {
        setStatusMessage(t('paywall.messages.currentStatus', { status: localizedPaymentStatus(result.payment.status) }));
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(t('paywall.messages.statusCheckFailed'));
    } finally {
      setIsChecking(false);
    }
  }, [isStatusUnauthorized, localizedPaymentStatus, refreshUserRole, router, t]);

  const handleCreatePayment = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    setStatusMessage(t('paywall.messages.creatingPayment'));

    try {
      setIsStatusUnauthorized(false);
      const response = await fetch('/api/payments/customer-access/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể tạo giao dịch');
      }

      if (result.hasAccess) {
        setIsCompletingAccess(true);
        await refreshUserRole();
        router.replace('/paywall/success');
        return;
      }

      setPayment(prev => prev ? { ...prev, ...result.payment } : {
        id: '',
        user_id: user?.id ?? '',
        order_code: result.payment.orderCode,
        payment_link_id: result.payment.paymentLinkId ?? null,
        amount: result.payment.amount,
        status: result.payment.status,
        checkout_url: result.payment.checkoutUrl,
        qr_code: null,
        description: 'Mở khóa FlavorQuest',
        paid_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (result.payment.checkoutUrl) {
        setStatusMessage(t('paywall.messages.createdPayment'));
        openHostedCheckout(result.payment.checkoutUrl);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : t('paywall.messages.createFailed'));
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, openHostedCheckout, refreshUserRole, router, t, user?.id]);

  useEffect(() => {
    setStatusMessage(t('paywall.messages.initial'));
  }, [t]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?type=customer');
      return;
    }

    if (!isRoleReady) return;

    if (isAdmin) {
      router.replace('/admin');
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

    if (hasCustomerAccess && !isCompletingAccess) {
      router.replace('/tour');
      return;
    }

    if (isStatusUnauthorized) {
      return;
    }

    refreshStatus(orderCodeFromQuery, true).catch(error => {
      console.error('[Paywall] init status failed:', error);
    });
  }, [hasCustomerAccess, isAdmin, isCompletingAccess, isLoading, isOwner, isPendingOwner, isRoleReady, isStatusUnauthorized, orderCodeFromQuery, refreshStatus, router, user]);

  if (isLoading || !isRoleReady) {
    return (
      <div className="min-h-screen bg-background-dark px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <DashboardSkeleton stats={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
            {t('paywall.badge')}
          </div>

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight">{t('paywall.title')}</h1>
          <p className="mb-6 text-sm leading-6 text-gray-300">
            {t('paywall.description.beforeAmount')}{' '}
            <span className="font-bold text-white">{t('paywall.amount')}</span>{' '}
            {t('paywall.description.afterAmount')}
          </p>

          <div className="mb-6 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{t('paywall.account')}</span>
              <span className="font-medium text-white">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{t('paywall.accessPlan')}</span>
              <span className="font-medium text-white">{t('paywall.lifetime')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{t('paywall.price')}</span>
              <span className="text-lg font-bold text-primary">{t('paywall.amount')}</span>
            </div>
            {payment && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('paywall.orderCode')}</span>
                  <span className="font-medium text-white">{payment.order_code}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('paywall.status')}</span>
                  <span className="font-medium text-white">{localizedPaymentStatus(payment.status)}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCreatePayment}
              disabled={isCreating}
              className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
            >
              {isCreating
                ? <InlineSpinner label={t('paywall.buttons.creating')} />
                : payment?.checkout_url
                  ? t('paywall.buttons.recreate')
                  : t('paywall.buttons.pay')}
            </button>

            {payment?.checkout_url && (
              <button
                type="button"
                onClick={() => openHostedCheckout(payment.checkout_url!)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold transition-colors hover:bg-white/10"
              >
                {t('paywall.buttons.openHosted')}
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshStatus(payment?.order_code ?? orderCodeFromQuery, true)}
              disabled={isChecking}
              className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
            >
              {isChecking ? <InlineSpinner label={t('paywall.buttons.checkingStatus')} color="primary" /> : t('paywall.buttons.checkStatus')}
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-2xl border border-white/10 bg-transparent px-5 py-4 font-semibold text-gray-300 transition-colors hover:bg-white/5"
            >
              {t('paywall.buttons.backHome')}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
            <p className="mb-2 font-semibold text-white">{t('paywall.systemStatus')}</p>
            <p>{statusMessage}</p>
            <p className="mt-3 text-xs text-gray-500">
              {t('paywall.webhookHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
