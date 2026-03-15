'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareShare, ShieldCheck, ShieldX } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import type { OwnerRequestAdminListItem, ReviewOwnerRequestPayload } from '@/lib/types';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OwnerRequestManager() {
  const router = useRouter();
  const toast = useToast();
  const [requests, setRequests] = useState<OwnerRequestAdminListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/owner-requests?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as OwnerRequestAdminListItem[];
      setRequests(data ?? []);
    } catch (error) {
      console.error('[OwnerRequestManager] load failed:', error);
      toast.error('Không thể tải danh sách chủ quán đang chờ duyệt.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleDecision = useCallback(
    async (payload: ReviewOwnerRequestPayload) => {
      setActiveRequestId(payload.userId);

      try {
        const response = await fetch('/api/users/owner-requests', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(result?.error || 'Không thể cập nhật yêu cầu chủ quán.');
        }

        setRequests((current) => current.filter((item) => item.id !== payload.userId));
        toast.success(
          payload.decision === 'approve'
            ? 'Đã duyệt tài khoản chủ quán.'
            : 'Đã từ chối yêu cầu chủ quán.'
        );
      } catch (error) {
        console.error('[OwnerRequestManager] update failed:', error);
        toast.error(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu chủ quán.');
      } finally {
        setActiveRequestId(null);
      }
    },
    [toast]
  );

  const summary = useMemo(
    () => ({
      total: requests.length,
      withThread: requests.filter((request) => Boolean(request.threadId)).length,
    }),
    [requests]
  );

  if (isLoading) {
    return <TableSkeleton columns={5} rows={6} />;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2c1e16]">
        <div className="grid gap-4 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(242,108,13,0.2),_transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-6 py-6 lg:grid-cols-2">
          <div>
            <p className="text-primary/80 text-xs font-semibold tracking-[0.28em] uppercase">
              Luồng duyệt chủ quán
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Ưu tiên xử lý từ màn này trước</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Mỗi tài khoản ở đây đều đã chủ động chọn luồng chủ quán khi đăng nhập. Quản trị viên có
              thể mở nhanh luồng trò chuyện `customer_admin` để xem ngữ cảnh rồi duyệt hoặc từ chối trực tiếp.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                Đang chờ duyệt
              </p>
              <p className="mt-3 text-3xl font-black text-white">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                Có luồng trò chuyện
              </p>
              <p className="text-primary mt-3 text-3xl font-black">{summary.withThread}</p>
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-semibold text-white">
              Không còn yêu cầu chủ quán nào đang chờ.
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Khi có khách hàng chọn luồng chủ quán ở màn đăng nhập, yêu cầu mới sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {requests.map((request) => {
              const isBusy = activeRequestId === request.id;

              return (
                <div
                  key={request.id}
                  className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-white">{request.email}</p>
                      <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
                        Chờ duyệt
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      Gửi yêu cầu lúc {formatDateTime(request.ownerRequestedAt)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                        Luồng trò chuyện
                      </p>
                      <p className="mt-2 text-sm text-gray-300">
                        {request.threadId
                          ? 'Đã sẵn sàng để mở nhanh.'
                          : 'Chưa tìm thấy luồng tương ứng.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                        Vai trò hiện tại
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">{request.role}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        request.threadId
                          ? router.push(`/admin/chat?threadId=${request.threadId}`)
                            : toast.warning('Yêu cầu này chưa có luồng trò chuyện để mở nhanh.')
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                    >
                      <MessageSquareShare className="h-4 w-4" />
                      Mở trò chuyện
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDecision({ userId: request.id, decision: 'approve' })
                      }
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Duyệt
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDecision({ userId: request.id, decision: 'reject' })
                      }
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldX className="h-4 w-4" />
                      Từ chối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
