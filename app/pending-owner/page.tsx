'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircleMore, ShieldCheck, Store } from 'lucide-react';
import { SupportInboxPage } from '@/components/chat/SupportInboxPage';
import { DashboardSkeleton } from '@/components/ui/Loading';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';

export default function PendingOwnerPage() {
  const router = useRouter();
  const {
    user,
    userRole,
    ownerRequestStatus,
    isLoading,
    isRoleReady,
    refreshUserRole,
  } = useAuth();
  const { t } = useTranslations();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    refreshUserRole().catch((error) => {
      console.error('[PendingOwnerPage] refreshUserRole failed:', error);
    });
  }, [refreshUserRole, user?.id]);

  useEffect(() => {
    if (isLoading || !isRoleReady) {
      return;
    }

    if (userRole === 'owner') {
      router.replace('/owner');
      return;
    }

    if (userRole === 'admin') {
      router.replace('/admin');
      return;
    }

    if (userRole !== 'pending-owner' || !ownerRequestStatus) {
      router.replace('/tour');
    }
  }, [isLoading, isRoleReady, ownerRequestStatus, router, userRole]);

  const isRejected = ownerRequestStatus === 'rejected';

  const steps = useMemo(
    () => [
      {
        icon: MessageCircleMore,
        title: t('pendingOwner.steps.request.title', undefined, 'Yêu cầu đã được ghi nhận'),
        body: t(
          'pendingOwner.steps.request.body',
          undefined,
          'Hệ thống đã mở luồng chat với admin để bạn bổ sung thông tin xác minh khi cần.'
        ),
      },
      {
        icon: ShieldCheck,
        title: t('pendingOwner.steps.review.title', undefined, 'Admin sẽ xác minh qua chat'),
        body: isRejected
          ? t(
              'pendingOwner.steps.reviewRejected.body',
              undefined,
              'Yêu cầu trước đó đã bị từ chối. Bạn vẫn có thể tiếp tục trao đổi trong khung chat bên dưới để làm rõ thêm.'
            )
          : t(
              'pendingOwner.steps.review.body',
              undefined,
              'Theo dõi tin nhắn ở đây để phản hồi nhanh nếu admin cần hỏi thêm trước khi duyệt.'
            ),
      },
      {
        icon: Store,
        title: t(
          'pendingOwner.steps.workspace.title',
          undefined,
          'Workspace owner sẽ mở sau khi duyệt'
        ),
        body: t(
          'pendingOwner.steps.workspace.body',
          undefined,
          'Sau khi được duyệt, bạn sẽ vào khu owner. Nếu chưa được gán quán, màn owner sẽ hiển thị trạng thái trống cho đến khi admin gán POI.'
        ),
      },
    ],
    [isRejected, t]
  );

  if (isLoading || !isRoleReady) {
    return <DashboardSkeleton stats={4} />;
  }

  return (
    <div className="bg-background-dark relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="bg-primary/14 absolute top-[-8%] left-[-10%] h-[34rem] w-[34rem] rounded-full blur-[140px]" />
        <div className="absolute right-[-6%] bottom-[-10%] h-[28rem] w-[28rem] rounded-full bg-[#ffcf99]/10 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 pb-10 sm:px-6">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#2c1e16]">
          <div className="grid gap-6 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(242,108,13,0.24),_transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <p className="text-primary/80 text-[11px] font-semibold tracking-[0.32em] uppercase">
                {t('pendingOwner.eyebrow', undefined, 'Khu chờ duyệt owner')}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black text-white sm:text-[2.4rem]">
                {isRejected
                  ? t(
                      'pendingOwner.titleRejected',
                      undefined,
                      'Yêu cầu owner của bạn cần trao đổi thêm với admin'
                    )
                  : t(
                      'pendingOwner.titlePending',
                      undefined,
                      'Tài khoản đang chờ admin xác minh để mở quyền chủ quán'
                    )}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300">
                {isRejected
                  ? t(
                      'pendingOwner.subtitleRejected',
                      undefined,
                      'Admin đã từ chối yêu cầu hiện tại. Bạn vẫn có thể tiếp tục trao đổi trong luồng chat bên dưới để bổ sung bối cảnh hoặc thông tin xác minh.'
                    )
                  : t(
                      'pendingOwner.subtitlePending',
                      undefined,
                      'Tài khoản này đang ở trạng thái chờ duyệt owner nên chưa thể dùng khu khách hàng hoặc owner. Luồng chat bên dưới là nơi chính để theo dõi và phản hồi nếu admin cần xác minh thêm.'
                    )}
              </p>
            </div>

            <div className="grid gap-3 self-start sm:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-black/20 px-5 py-5">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-gray-500 uppercase">
                  {t('pendingOwner.statusLabel', undefined, 'Trạng thái')}
                </p>
                <p
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${
                    isRejected
                      ? 'border-red-400/30 bg-red-500/10 text-red-200'
                      : 'border-amber-300/30 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  {isRejected
                    ? t('pendingOwner.statusRejected', undefined, 'Đã từ chối')
                    : t('pendingOwner.statusPending', undefined, 'Đang chờ duyệt')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-5 text-left transition-colors hover:bg-white/10"
              >
                <p className="text-[11px] font-semibold tracking-[0.24em] text-gray-500 uppercase">
                  {t('pendingOwner.customerAreaLabel', undefined, 'Điều hướng')}
                </p>
                <p className="mt-3 text-lg font-bold text-white">
                  {t('pendingOwner.customerCta', undefined, 'Quay về màn hình chào')}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {t(
                    'pendingOwner.customerHint',
                    undefined,
                    'Trong lúc chưa được duyệt, tài khoản này chỉ có thể theo dõi trạng thái và trao đổi với admin.'
                  )}
                </p>
              </button>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 lg:grid-cols-3 lg:px-8">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="rounded-[26px] border border-white/10 bg-black/15 px-5 py-5"
                >
                  <div className="border-primary/20 bg-primary/12 text-primary flex h-11 w-11 items-center justify-center rounded-2xl border">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-white">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-[#2c1e16] p-3 sm:p-4">
          <SupportInboxPage role="pending-owner" mode="owner-request" showHero={false} />
        </section>
      </div>
    </div>
  );
}
