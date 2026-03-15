'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Loading';
import type { POI, Tour } from '@/lib/types';
import { USER_PRESENCE_CHANNEL } from '@/lib/realtime/presence';

interface DashboardTourAnalytics {
  id: string;
  name_vi: string;
  cover_image_url: string | null;
  estimated_duration_min: number | null;
  poi_count: number;
  is_active: boolean;
  starts: number;
  sessions: number;
  total_plays: number;
  auto_plays: number;
  manual_plays: number;
  skips: number;
  completed_tours: number;
  completion_rate: number;
  avg_duration_min: number | null;
}

interface AnalyticsSummaryResponse {
  overview: {
    total_tours: number;
    total_plays: number;
    unique_sessions: number;
    tracked_tours: number;
  };
  tours: DashboardTourAnalytics[];
}

interface PaymentHistoryResponse {
  stats: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    totalRevenue: number;
  };
  payments: Array<{
    user_id: string;
    customer_access_granted: boolean;
  }>;
}

interface DashboardSnapshot {
  analytics: AnalyticsSummaryResponse;
  payments: PaymentHistoryResponse;
  pois: POI[];
  tours: Tour[];
  userCount: number;
  accessGrantedCount: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRatio(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);

    try {
      const supabase = createClient();

      const [
        analyticsResponse,
        paymentsResponse,
        poisResponse,
        toursResponse,
        userCountResult,
        accessGrantedResult,
      ] = await Promise.all([
        fetch('/api/analytics/summary?period=7days'),
        fetch('/api/payments/customer-access/history?status=ALL', { cache: 'no-store' }),
        fetch('/api/pois?include_deleted=true', { cache: 'no-store' }),
        fetch('/api/tours?admin_view=true', { cache: 'no-store' }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('customer_access_granted', true),
      ]);

      if (!analyticsResponse.ok) {
        throw new Error('Không thể tải bảng phân tích tổng quan');
      }

      if (!paymentsResponse.ok) {
        throw new Error('Không thể tải dữ liệu cổng thanh toán');
      }

      if (!poisResponse.ok) {
        throw new Error('Không thể tải danh sách POI');
      }

      if (!toursResponse.ok) {
        throw new Error('Không thể tải danh sách tour');
      }

      if (userCountResult.error) {
        throw userCountResult.error;
      }

      if (accessGrantedResult.error) {
        throw accessGrantedResult.error;
      }

      const [analytics, payments, pois, tours] = await Promise.all([
        analyticsResponse.json() as Promise<AnalyticsSummaryResponse>,
        paymentsResponse.json() as Promise<PaymentHistoryResponse>,
        poisResponse.json() as Promise<POI[]>,
        toursResponse.json() as Promise<Tour[]>,
      ]);

      if (requestId === latestRequestRef.current) {
        setSnapshot({
          analytics,
          payments,
          pois,
          tours,
          userCount: userCountResult.count ?? 0,
          accessGrantedCount: accessGrantedResult.count ?? 0,
        });
      }
    } catch (error) {
      console.error('[AdminDashboard] load failed:', error);
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    const refreshDashboard = () => {
      void loadDashboard();
    };

    const dataChannel = supabase.channel('admin-dashboard-realtime');
    dataChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pois' }, refreshDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, refreshDashboard)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analytics_logs' },
        refreshDashboard
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refreshDashboard)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_access_payments' },
        refreshDashboard
      )
      .subscribe();
    channels.push(dataChannel);

    const presenceChannel = supabase.channel(USER_PRESENCE_CHANNEL);
    const syncOnlineUsers = () => {
      const state = presenceChannel.presenceState();
      const onlineUserIds = new Set<string>();

      Object.entries(state).forEach(([presenceKey, presences]) => {
        if (Array.isArray(presences)) {
          presences.forEach((presence) => {
            if (
              presence &&
              typeof presence === 'object' &&
              'userId' in presence &&
              typeof presence.userId === 'string'
            ) {
              onlineUserIds.add(presence.userId);
              return;
            }
          });
        }

        if (presenceKey) {
          onlineUserIds.add(presenceKey);
        }
      });

      if (user?.id) {
        onlineUserIds.add(user.id);
      }

      setOnlineUsers(onlineUserIds.size);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, syncOnlineUsers)
      .on('presence', { event: 'join' }, syncOnlineUsers)
      .on('presence', { event: 'leave' }, syncOnlineUsers)
      .subscribe();
    channels.push(presenceChannel);

    return () => {
      channels.forEach((channel) => {
        void channel.unsubscribe();
      });
    };
  }, [loadDashboard, user?.id]);

  const derived = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    const activePois = snapshot.pois.filter((poi) => !poi.deleted_at);
    const hiddenPois = snapshot.pois.length - activePois.length;
    const activeTours = snapshot.tours.filter((tour) => tour.is_active);
    const toursWithCover = snapshot.tours.filter((tour) => Boolean(tour.cover_image_url));
    const poisWithImage = activePois.filter((poi) => Boolean(poi.image_url));
    const poisWithAudio = activePois.filter((poi) => Boolean(poi.audio_url_vi));
    const poisWithEnglishName = activePois.filter((poi) => Boolean(poi.name_en?.trim()));
    const totalManualPlays = snapshot.analytics.tours.reduce(
      (sum, tour) => sum + tour.manual_plays,
      0
    );
    const totalAutoPlays = snapshot.analytics.tours.reduce((sum, tour) => sum + tour.auto_plays, 0);
    const totalSkips = snapshot.analytics.tours.reduce((sum, tour) => sum + tour.skips, 0);
    const manualShare = snapshot.analytics.overview.total_plays
      ? Math.round((totalManualPlays / snapshot.analytics.overview.total_plays) * 100)
      : 0;
    const topTour = snapshot.analytics.tours[0] ?? null;
    const avgPoisPerTour = snapshot.tours.length
      ? (
          snapshot.tours.reduce((sum, tour) => sum + tour.poi_ids.length, 0) / snapshot.tours.length
        ).toFixed(1)
      : '0';
    const recentUpdates = [
      ...activePois.map((poi) => ({
        id: poi.id,
        title: poi.name_vi,
        subtitle: poi.signature_dish || 'POI mới hoặc vừa cập nhật nội dung',
        type: 'POI',
        route: '/admin/pois',
        updatedAt: poi.updated_at,
      })),
      ...snapshot.tours.map((tour) => ({
        id: tour.id,
        title: tour.name_vi,
        subtitle: `${tour.poi_ids.length} POI trong hành trình`,
        type: 'Tour',
        route: '/admin/tours',
        updatedAt: tour.updated_at,
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);

    const attentionItems = [
      {
        label: 'POI thiếu ảnh',
        value: activePois.filter((poi) => !poi.image_url).length,
        note: 'Ảnh giúp thẻ nội dung và trang khách hàng đỡ trống.',
        route: '/admin/pois',
      },
      {
        label: 'POI thiếu audio VI',
        value: activePois.filter((poi) => !poi.audio_url_vi).length,
        note: 'Nên ưu tiên lấp khoảng trống giọng đọc tiếng Việt.',
        route: '/admin/pois',
      },
      {
        label: 'Tour chưa có ảnh bìa',
        value: snapshot.tours.filter((tour) => !tour.cover_image_url).length,
        note: 'Tour list sẽ thuyết phục hơn khi có visual riêng.',
        route: '/admin/tours',
      },
      {
        label: 'Tour đang ẩn',
        value: snapshot.tours.filter((tour) => !tour.is_active).length,
        note: 'Kiểm tra lại những tour đã soạn xong nhưng chưa mở.',
        route: '/admin/tours',
      },
    ].sort((a, b) => b.value - a.value);

    const quickActions = [
      {
        label: 'Thêm POI mới',
        description: 'Tạo địa điểm mới và gắn audio, ảnh, món đặc trưng.',
        href: '/admin/pois/new',
        accent: 'text-emerald-300',
      },
      {
        label: 'Quản lý tour',
        description: 'Sắp xếp hành trình, kiểm tra ảnh bìa, mở hoặc ẩn tour.',
        href: '/admin/tours',
        accent: 'text-amber-200',
      },
      {
        label: 'Xem phân tích',
        description: 'Đi sâu vào tỷ lệ hoàn tất, áp lực bỏ qua và hành vi nghe.',
        href: '/admin/analytics',
        accent: 'text-primary',
      },
      {
        label: 'Kiểm tra cổng khóa nội dung',
        description: 'Theo dõi giao dịch, trạng thái mở khóa và doanh thu.',
        href: '/admin/payments',
        accent: 'text-sky-300',
      },
    ];

    return {
      activePois,
      hiddenPois,
      activeTours,
      toursWithCover,
      poisWithImage,
      poisWithAudio,
      poisWithEnglishName,
      totalManualPlays,
      totalAutoPlays,
      totalSkips,
      manualShare,
      topTour,
      avgPoisPerTour,
      recentUpdates,
      attentionItems,
      quickActions,
    };
  }, [snapshot]);

  if (isLoading && !snapshot) {
    return <DashboardSkeleton stats={6} />;
  }

  if (!snapshot || !derived) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-8 text-sm text-red-100">
        Không thể tải dữ liệu bảng điều hành. Hãy thử làm mới lại trang.
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'POI đang hoạt động',
      value: formatNumber(derived.activePois.length),
      note: `${formatNumber(derived.hiddenPois)} mục đang ẩn hoặc đã gỡ`,
      accent: 'text-sky-300',
      border: 'border-sky-400/20',
      glow: 'from-sky-500/15',
    },
    {
      label: 'Tour đang mở',
      value: formatNumber(derived.activeTours.length),
      note: `${snapshot.tours.length} tour tổng, trung bình ${derived.avgPoisPerTour} POI / tour`,
      accent: 'text-amber-200',
      border: 'border-amber-400/20',
      glow: 'from-amber-500/15',
    },
    {
      label: 'Audio 7 ngày',
      value: formatNumber(snapshot.analytics.overview.total_plays),
      note: `${derived.manualShare}% là phát thủ công, ${formatNumber(derived.totalSkips)} lượt bỏ qua`,
      accent: 'text-primary',
      border: 'border-primary/20',
      glow: 'from-primary/15',
    },
    {
      label: 'Phiên người dùng',
      value: formatNumber(snapshot.analytics.overview.unique_sessions),
      note: `${formatNumber(snapshot.analytics.overview.tracked_tours)} tour có dữ liệu trong 7 ngày`,
      accent: 'text-violet-200',
      border: 'border-violet-400/20',
      glow: 'from-violet-500/15',
    },
    {
      label: 'Khách đã mở khóa',
      value: formatNumber(snapshot.accessGrantedCount),
      note: `${formatRatio(snapshot.accessGrantedCount, snapshot.userCount)} trên tổng ${formatNumber(snapshot.userCount)} tài khoản`,
      accent: 'text-emerald-300',
      border: 'border-emerald-400/20',
      glow: 'from-emerald-500/15',
    },
    {
      label: 'Người dùng đang online',
      value: formatNumber(onlineUsers),
      note: 'Số tài khoản đang hiện diện theo thời gian thực',
      accent: 'text-lime-300',
      border: 'border-lime-400/20',
      glow: 'from-lime-500/15',
    },
    {
      label: 'Doanh thu cổng thanh toán',
      value: formatCurrency(snapshot.payments.stats.totalRevenue),
      note: `${formatNumber(snapshot.payments.stats.paid)} giao dịch thành công, ${formatNumber(snapshot.payments.stats.pending)} giao dịch chờ`,
      accent: 'text-rose-200',
      border: 'border-rose-400/20',
      glow: 'from-rose-500/15',
    },
  ];

  const healthMeters = [
    {
      label: 'POI có ảnh',
      value: derived.poisWithImage.length,
      total: derived.activePois.length,
      tone: 'bg-sky-400',
    },
    {
      label: 'POI có audio tiếng Việt',
      value: derived.poisWithAudio.length,
      total: derived.activePois.length,
      tone: 'bg-primary',
    },
    {
      label: 'POI có tên tiếng Anh',
      value: derived.poisWithEnglishName.length,
      total: derived.activePois.length,
      tone: 'bg-violet-400',
    },
    {
      label: 'Tour có ảnh bìa',
      value: derived.toursWithCover.length,
      total: snapshot.tours.length,
      tone: 'bg-emerald-400',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-primary/80 text-xs font-semibold tracking-[0.32em] uppercase">
            Trung tâm điều hành
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">Bảng điều hành FlavorQuest</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Tập trung vào nhịp vận hành 7 ngày gần nhất, chất lượng nội dung và các điểm cần xử lý
            để phần quản trị không chỉ đẹp mà còn hữu ích khi ra quyết định.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.open('/', '_blank')}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
          >
            Mở giao diện khách hàng
          </button>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="bg-primary rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600"
          >
            Làm mới bảng điều hành
          </button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2c1e16]">
          <div className="from-primary/12 border-b border-white/10 bg-gradient-to-r via-transparent to-transparent px-6 py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-primary text-sm font-semibold">Nhịp hoạt động 7 ngày</p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {derived.topTour
                    ? `${derived.topTour.name_vi} đang dẫn nhịp với ${formatNumber(derived.topTour.total_plays)} lượt phát`
                    : 'Chưa có tour nổi bật trong giai đoạn hiện tại'}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  {derived.topTour
                    ? `Tour này ghi nhận ${formatNumber(derived.topTour.sessions)} phiên, tỷ lệ hoàn tất ${derived.topTour.completion_rate}% và đang là điểm tựa chính cho mức sử dụng audio của toàn hệ thống.`
                    : 'Khi dữ liệu phân tích tăng lên, khu vực này sẽ tóm tắt tour hoặc xu hướng vận hành đáng chú ý nhất.'}
                </p>
              </div>

              <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
                {[
                  {
                    label: 'Lượt bắt đầu tour',
                    value: formatNumber(snapshot.analytics.overview.total_tours),
                    note: 'bắt đầu hành trình',
                    accent: 'text-primary',
                  },
                  {
                    label: 'Thanh toán cổng khóa nội dung',
                    value: formatNumber(snapshot.payments.stats.paid),
                    note: 'giao dịch thành công',
                    accent: 'text-emerald-300',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                          {item.label}
                        </p>
                        <p className={`mt-3 text-3xl leading-none font-black ${item.accent}`}>
                          {item.value}
                        </p>
                        <p className="mt-3 text-sm text-gray-400">{item.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            {healthMeters.map((item) => {
              const ratio = item.total ? Math.round((item.value / item.total) * 100) : 0;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/15 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <span className="text-xs font-semibold text-gray-400">{ratio}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    {formatNumber(item.value)} / {formatNumber(item.total)} mục đã hoàn thiện
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-primary text-sm font-semibold">Cần chú ý</p>
              <h3 className="mt-1 text-xl font-black text-white">Bảng cần chú ý</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
              {formatNumber(derived.attentionItems.reduce((sum, item) => sum + item.value, 0))} việc
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {derived.attentionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.route)}
                className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{item.note}</p>
                  </div>
                  <span className="bg-primary/10 text-primary min-w-10 rounded-full px-3 py-1 text-center text-sm font-bold">
                    {formatNumber(item.value)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`overflow-hidden rounded-[24px] border ${card.border} bg-[#2c1e16] shadow-lg`}
          >
            <div
              className={`bg-gradient-to-r ${card.glow} via-transparent to-transparent px-5 py-5`}
            >
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
              <p className="mt-3 text-xs leading-5 text-gray-400">{card.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-primary text-sm font-semibold">Hiệu suất nổi bật</p>
              <h3 className="mt-1 text-xl font-black text-white">Tour thu hút tốt nhất</h3>
            </div>
            <button
              type="button"
              onClick={() => router.push('/admin/analytics')}
              className="text-primary text-sm font-semibold transition-colors hover:text-orange-300"
            >
              Mở trang phân tích
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.analytics.tours.slice(0, 5).map((tour, index) => (
              <div
                key={tour.id}
                className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{tour.name_vi}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatNumber(tour.sessions)} phiên • {formatNumber(tour.total_plays)} lượt
                        phát • {tour.poi_count} POI
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tour.completion_rate >= 60
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : tour.completion_rate >= 35
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    Hoàn tất {tour.completion_rate}%
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-black/20 px-3 py-3">
                    <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">Bắt đầu</p>
                    <p className="mt-2 text-lg font-bold text-white">{formatNumber(tour.starts)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-3">
                    <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                      Tự động / Thủ công
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {formatNumber(tour.auto_plays)} / {formatNumber(tour.manual_plays)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-3">
                    <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                      Thời lượng TB
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {tour.avg_duration_min ? `${tour.avg_duration_min} phút` : 'Chưa đủ dữ liệu'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {snapshot.analytics.tours.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                Chưa có dữ liệu phân tích để xếp hạng tour.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Cập nhật gần đây</p>
                <h3 className="mt-1 text-xl font-black text-white">Luồng nội dung mới chỉnh</h3>
              </div>
              <span className="text-xs text-gray-400">Cập nhật gần nhất</span>
            </div>

            <div className="mt-5 space-y-3">
              {derived.recentUpdates.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => router.push(item.route)}
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-gray-300">
                          {item.type}
                        </span>
                        <p className="font-semibold text-white">{item.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">{item.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDateTime(item.updatedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <div>
              <p className="text-primary text-sm font-semibold">Thao tác nhanh</p>
              <h3 className="mt-1 text-xl font-black text-white">Lối tắt cho các việc hay làm</h3>
            </div>

            <div className="mt-5 grid gap-3">
              {derived.quickActions.map((action) => (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => router.push(action.href)}
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-left transition-colors hover:bg-white/5"
                >
                  <p className={`font-semibold ${action.accent}`}>{action.label}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
