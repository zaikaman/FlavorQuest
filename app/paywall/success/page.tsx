'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function PaywallSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customerAccessGrantedAt, hasCustomerAccess } = useAuth();
  const [countdown, setCountdown] = useState(8);

  const orderCode = searchParams.get('orderCode');
  const grantedTime = useMemo(() => {
    if (!customerAccessGrantedAt) {
      return 'Vừa xong';
    }

    return new Date(customerAccessGrantedAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, [customerAccessGrantedAt]);

  useEffect(() => {
    if (!hasCustomerAccess) {
      router.replace('/paywall');
      return;
    }

    if (countdown <= 0) {
      router.replace('/tour');
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, hasCustomerAccess, router]);

  return (
    <div className="min-h-screen bg-background-dark text-white px-4 py-8 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-10 md:px-10 md:py-14 text-center border-b border-white/10 bg-gradient-to-b from-emerald-400/10 to-transparent">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/30 shadow-[0_0_60px_rgba(16,185,129,0.25)]">
              <span className="material-symbols-outlined text-5xl text-emerald-400">verified</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-1.5 text-sm font-semibold text-emerald-300 mb-4">
              <span className="material-symbols-outlined text-base">lock_open</span>
              Đã mở khóa thành công
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Chào mừng bạn đến với <span className="text-primary">FlavorQuest Premium</span>
            </h1>
            <p className="max-w-2xl mx-auto text-gray-300 leading-7 text-base md:text-lg">
              Khoản thanh toán đã được xác nhận. Tài khoản khách hàng của bạn hiện đã được mở khóa <span className="font-bold text-white">vĩnh viễn</span>.
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[1.15fr,0.85fr] md:p-10">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-bold mb-4">Quyền lợi đã kích hoạt</h2>
                <div className="space-y-3 text-sm text-gray-300">
                  {[
                    'Truy cập đầy đủ toàn bộ trải nghiệm audio tour',
                    'Không cần thanh toán lại cho những lần đăng nhập sau',
                    'Tiếp tục dùng được trên cùng tài khoản khách hàng',
                    'Tự động xác nhận qua webhook payOS an toàn',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-400 mt-0.5">check_circle</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
                <h3 className="font-bold text-white mb-2">Tiếp theo bạn có thể làm gì?</h3>
                <p className="text-sm text-gray-300 leading-6">
                  Mở bản đồ tour, duyệt POI gần bạn, và bắt đầu nghe thuyết minh tự động ngay khi tiến vào khu vực Vĩnh Khánh.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Trạng thái</span>
                  <span className="font-bold text-emerald-400">PAID</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Gói truy cập</span>
                  <span className="font-semibold text-white">Vĩnh viễn</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Số tiền</span>
                  <span className="font-semibold text-white">20.000 VND</span>
                </div>
                {orderCode && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Mã đơn</span>
                    <span className="font-semibold text-white">{orderCode}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Thời điểm kích hoạt</span>
                  <span className="font-semibold text-white text-right">{grantedTime}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-sm text-gray-400 mb-2">Tự động chuyển sau</p>
                <p className="text-4xl font-extrabold text-primary mb-4">{countdown}s</p>
                <button
                  type="button"
                  onClick={() => router.push('/tour')}
                  className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-white hover:bg-orange-600 transition-colors"
                >
                  Vào ứng dụng ngay
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full mt-3 rounded-2xl border border-white/10 px-5 py-4 font-semibold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}