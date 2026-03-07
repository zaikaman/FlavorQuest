'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';

interface PaymentHistoryItem {
  id: string;
  user_id: string;
  email: string;
  order_code: number;
  payment_link_id: string | null;
  amount: number;
  status: PaymentStatus;
  description: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer_access_granted: boolean;
  customer_access_granted_at: string | null;
}

interface PaymentHistoryResponse {
  stats: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    totalRevenue: number;
  };
  payments: PaymentHistoryItem[];
}

const STATUS_OPTIONS = ['ALL', 'PAID', 'PENDING', 'PROCESSING', 'UNDERPAID', 'CANCELLED', 'EXPIRED', 'FAILED'] as const;

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function getStatusBadgeClass(status: PaymentStatus) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25';
    case 'PENDING':
    case 'PROCESSING':
    case 'UNDERPAID':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/25';
    default:
      return 'bg-red-500/15 text-red-200 border-red-400/25';
  }
}

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [stats, setStats] = useState<PaymentHistoryResponse['stats']>({
    total: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    totalRevenue: 0,
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payments/customer-access/history?status=${statusFilter}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Không thể tải lịch sử thanh toán');
      }

      const result = await response.json() as PaymentHistoryResponse;
      setPayments(result.payments);
      setStats(result.stats);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredPayments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return payments;

    return payments.filter(item =>
      item.email.toLowerCase().includes(normalized)
      || String(item.order_code).includes(normalized)
      || (item.payment_link_id ?? '').toLowerCase().includes(normalized)
    );
  }, [payments, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lịch sử thanh toán paywall</h1>
          <p className="text-gray-400">Theo dõi giao dịch mở khóa khách hàng qua payOS.</p>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5"
        >
          Làm mới dữ liệu
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tổng giao dịch', value: stats.total, accent: 'text-white' },
          { label: 'Đã thanh toán', value: stats.paid, accent: 'text-emerald-300' },
          { label: 'Đang chờ xử lý', value: stats.pending, accent: 'text-amber-200' },
          { label: 'Doanh thu', value: `${formatCurrency(stats.totalRevenue)} VND`, accent: 'text-primary' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-[#2c1e16] p-5 shadow-lg">
            <p className="text-sm text-gray-400 mb-2">{card.label}</p>
            <p className={`text-2xl font-extrabold ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#2c1e16] p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                  statusFilter === option
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm theo email, mã đơn, payment link"
            className="w-full lg:w-96 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary/40"
          />
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 rounded-full border-b-2 border-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Kích hoạt</th>
                  <th className="px-4 py-3">Tạo lúc</th>
                  <th className="px-4 py-3">Thanh toán lúc</th>
                  <th className="px-4 py-3">Payment Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{item.email}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{item.order_code}</td>
                    <td className="px-4 py-4 font-semibold text-white">{formatCurrency(item.amount)} VND</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${item.customer_access_granted ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                        <span className="material-symbols-outlined text-sm">{item.customer_access_granted ? 'check_circle' : 'schedule'}</span>
                        {item.customer_access_granted ? 'Đã mở khóa' : 'Chưa mở khóa'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-4 text-xs text-gray-400">{formatDateTime(item.paid_at ?? item.customer_access_granted_at)}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 max-w-48 truncate">{item.payment_link_id ?? '—'}</td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      Không tìm thấy giao dịch phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}