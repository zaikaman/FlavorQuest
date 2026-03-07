'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

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

const POLLABLE_STATUSES: PaymentStatus[] = ['PENDING', 'PROCESSING', 'UNDERPAID'];

function isLocalhostHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function resolveReturnUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    try {
      return new URL('/paywall', appUrl).toString();
    } catch (error) {
      console.warn('[Paywall] NEXT_PUBLIC_APP_URL không hợp lệ:', error);
    }
  }

  return new URL('/paywall', window.location.origin).toString();
}

function shouldUseEmbeddedCheckout(returnUrl: string) {
  try {
    const url = new URL(returnUrl);
    return url.protocol === 'https:' && !isLocalhostHostname(url.hostname);
  } catch {
    return false;
  }
}

export default function PaywallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isLoading,
    isRoleReady,
    isOwner,
    isAdmin,
    hasCustomerAccess,
    refreshUserRole,
  } = useAuth();

  const [payment, setPayment] = useState<CustomerAccessPayment | null>(null);
  const [statusMessage, setStatusMessage] = useState('Thanh toán một lần 20.000 VND để mở khóa ứng dụng vĩnh viễn.');
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCompletingAccess, setIsCompletingAccess] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const checkoutInstanceRef = useRef<{ open: () => void; exit: () => void } | null>(null);

  const fallbackToHostedCheckout = useCallback((checkoutUrl: string, reason?: string) => {
    if (reason) {
      console.warn('[Paywall] embedded checkout fallback:', reason);
    }

    setStatusMessage(
      'Môi trường hiện tại không hỗ trợ payOS embedded ổn định. Đang mở trang thanh toán payOS ở tab mới để bạn tiếp tục.'
    );

    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const orderCodeFromQuery = useMemo(() => {
    const raw = searchParams.get('orderCode');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const openEmbedded = useCallback((checkoutUrl: string) => {
    let normalizedCheckoutUrl = '';
    let returnUrl = '';

    try {
      normalizedCheckoutUrl = new URL(checkoutUrl).toString();
      returnUrl = resolveReturnUrl();
    } catch (error) {
      console.error('[Paywall] invalid payOS url:', error);
      setStatusMessage('Link thanh toán payOS không hợp lệ. Vui lòng tạo lại giao dịch mới.');
      return;
    }

    if (!shouldUseEmbeddedCheckout(returnUrl)) {
      fallbackToHostedCheckout(
        normalizedCheckoutUrl,
        'RETURN_URL không phải HTTPS public hoặc đang chạy trên localhost.'
      );
      return;
    }

    if (!window.PayOSCheckout) {
      setStatusMessage('Chưa tải xong tiện ích thanh toán payOS. Vui lòng thử lại sau vài giây.');
      return;
    }

    try {
      checkoutInstanceRef.current?.exit();
      const instance = window.PayOSCheckout.usePayOS({
        RETURN_URL: returnUrl,
        ELEMENT_ID: 'payos-embedded-container',
        CHECKOUT_URL: normalizedCheckoutUrl,
        embedded: true,
        onSuccess: () => {
          setStatusMessage('Đã nhận tín hiệu thành công. Đang xác nhận thanh toán...');
        },
      });

      checkoutInstanceRef.current = instance;
      instance.open();
    } catch (error) {
      console.error('[Paywall] open embedded checkout failed:', error);
      fallbackToHostedCheckout(normalizedCheckoutUrl, error instanceof Error ? error.message : 'Unknown error');
    }
  }, [fallbackToHostedCheckout]);

  const refreshStatus = useCallback(async (orderCode?: number | null, force = true) => {
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

      if (!response.ok) {
        throw new Error('Không thể kiểm tra trạng thái thanh toán');
      }

      const result = await response.json() as StatusResponse;
      setPayment(result.payment);

      if (result.hasAccess) {
        setStatusMessage('Thanh toán thành công. Đang chuyển bạn vào ứng dụng...');
        setIsCompletingAccess(true);
        await refreshUserRole();
        router.replace(orderCode ? `/paywall/success?orderCode=${orderCode}` : '/paywall/success');
        return;
      }

      if (result.payment?.status === 'CANCELLED') {
        setStatusMessage('Bạn đã hủy thanh toán. Có thể tạo lại giao dịch bất cứ lúc nào.');
      } else if (result.payment?.status === 'EXPIRED') {
        setStatusMessage('Link thanh toán đã hết hạn. Vui lòng tạo giao dịch mới.');
      } else if (result.payment?.status === 'PAID') {
        setStatusMessage('Thanh toán đã ghi nhận. Đang đồng bộ quyền truy cập...');
      } else if (result.payment?.status) {
        setStatusMessage(`Trạng thái hiện tại: ${result.payment.status}. Hệ thống sẽ tự kiểm tra lại.`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Không thể kiểm tra trạng thái thanh toán lúc này.');
    } finally {
      setIsChecking(false);
    }
  }, [refreshUserRole, router]);

  const handleCreatePayment = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    setStatusMessage('Đang tạo giao dịch payOS...');

    try {
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
        description: 'Mo khoa FlavorQuest',
        paid_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (result.payment.checkoutUrl) {
        setStatusMessage('Đã tạo giao dịch. Vui lòng quét mã hoặc thanh toán ngay trong khung bên dưới.');
        openEmbedded(result.payment.checkoutUrl);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : 'Tạo giao dịch thất bại.');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, openEmbedded, refreshUserRole, router, user?.id]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?type=customer');
      return;
    }

    if (!isRoleReady) return;

    if (isOwner || isAdmin) {
      router.replace('/owner');
      return;
    }

    if (hasCustomerAccess && !isCompletingAccess) {
      router.replace('/tour');
      return;
    }

    refreshStatus(orderCodeFromQuery, true).catch(error => {
      console.error('[Paywall] init status failed:', error);
    });
  }, [hasCustomerAccess, isAdmin, isCompletingAccess, isLoading, isOwner, isRoleReady, orderCodeFromQuery, refreshStatus, router, user]);

  useEffect(() => {
    if (!scriptReady || !payment?.checkout_url) return;
    openEmbedded(payment.checkout_url);
  }, [scriptReady, payment?.checkout_url, openEmbedded]);

  useEffect(() => {
    if (!payment || !POLLABLE_STATUSES.includes(payment.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshStatus(payment.order_code, true).catch(error => {
        console.error('[Paywall] poll status failed:', error);
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [payment, refreshStatus]);

  useEffect(() => {
    return () => {
      checkoutInstanceRef.current?.exit();
    };
  }, []);

  if (isLoading || !isRoleReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-b-2 border-primary animate-spin" />
          <p>Đang tải paywall...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white px-4 py-8">
      <Script
        src="https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[420px,1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
          <div className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-sm text-primary font-semibold mb-4">
            Mở khóa vĩnh viễn
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-3">Thanh toán để tiếp tục dùng FlavorQuest</h1>
          <p className="text-sm text-gray-300 leading-6 mb-6">
            Tài khoản khách hàng cần thanh toán <span className="font-bold text-white">20.000 VND</span> một lần để mở khóa toàn bộ trải nghiệm ứng dụng vĩnh viễn.
          </p>

          <div className="rounded-2xl bg-black/30 border border-white/10 p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Tài khoản</span>
              <span className="font-medium text-white">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Gói truy cập</span>
              <span className="font-medium text-white">Vĩnh viễn</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Giá</span>
              <span className="font-bold text-primary text-lg">20.000 VND</span>
            </div>
            {payment && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Mã đơn</span>
                  <span className="font-medium text-white">{payment.order_code}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Trạng thái</span>
                  <span className="font-medium text-white">{payment.status}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCreatePayment}
              disabled={isCreating}
              className="w-full rounded-2xl bg-primary text-white font-bold px-5 py-4 hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isCreating ? 'Đang tạo thanh toán...' : payment?.checkout_url ? 'Tạo lại giao dịch mới' : 'Thanh toán bằng payOS'}
            </button>

            {payment?.checkout_url && (
              <button
                type="button"
                onClick={() => openEmbedded(payment.checkout_url!)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold hover:bg-white/10 transition-colors"
              >
                Mở lại khung thanh toán
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshStatus(payment?.order_code ?? orderCodeFromQuery, true)}
              disabled={isChecking}
              className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 font-semibold text-primary hover:bg-primary/15 transition-colors disabled:opacity-60"
            >
              {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-2xl border border-white/10 bg-transparent px-5 py-4 font-semibold text-gray-300 hover:bg-white/5 transition-colors"
            >
              Quay lại trang chủ
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300 leading-6">
            <p className="font-semibold text-white mb-2">Trạng thái hệ thống</p>
            <p>{statusMessage}</p>
            <p className="mt-3 text-xs text-gray-500">
              Quyền truy cập sẽ được kích hoạt tự động qua webhook. Nếu webhook đến chậm, bạn vẫn có thể bấm kiểm tra trạng thái để đồng bộ ngay.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl min-h-[640px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Khung thanh toán nhúng</h2>
              <p className="text-sm text-gray-400">Thanh toán ngay trên trang, không cần rời khỏi ứng dụng.</p>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
              {scriptReady ? 'payOS sẵn sàng' : 'Đang tải payOS'}
            </div>
          </div>

          <div
            id="payos-embedded-container"
            className="min-h-[540px] rounded-2xl border border-dashed border-white/15 bg-black/20 overflow-hidden"
          />

          {!payment?.checkout_url && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
              Sau khi tạo giao dịch, giao diện thanh toán nhúng của payOS sẽ xuất hiện tại đây.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}