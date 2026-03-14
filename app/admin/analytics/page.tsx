'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DailyStats {
  date: string;
  total_tours: number;
  total_plays: number;
  unique_sessions: number;
}

interface TourAnalyticsItem {
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

interface TourFilterOption {
  id: string;
  name_vi: string;
  is_active: boolean;
}

interface AnalyticsSummaryResponse {
  overview: {
    total_tours: number;
    total_plays: number;
    unique_sessions: number;
    tracked_tours: number;
  };
  daily: DailyStats[];
  tours: TourAnalyticsItem[];
  availableTours: TourFilterOption[];
  selectedTourId: string | null;
}

type LeaderboardSort = 'plays' | 'sessions' | 'completion' | 'skipPressure';
const EMPTY_DAILY: DailyStats[] = [];
const EMPTY_TOURS: TourAnalyticsItem[] = [];
const EMPTY_FILTERS: TourFilterOption[] = [];

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDuration(value: number | null) {
  return value ? `${value} phút` : 'Chưa đủ dữ liệu';
}

function getSkipPressure(tour: TourAnalyticsItem) {
  if (!tour.starts) return 0;
  return (tour.skips / tour.starts) * 100;
}

function getPlaysPerSession(tour: TourAnalyticsItem) {
  if (!tour.sessions) return 0;
  return tour.total_plays / tour.sessions;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [period, setPeriod] = useState('7days');
  const [selectedTourId, setSelectedTourId] = useState('');
  const [focusedTourId, setFocusedTourId] = useState('');
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('plays');
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestRef = useRef(0);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ period });
      if (selectedTourId) {
        params.set('tour_id', selectedTourId);
      }

      const response = await fetch(`/api/analytics/summary?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu phân tích');
      }

      const jsonData = (await response.json()) as AnalyticsSummaryResponse;
      if (requestId === latestRequestRef.current) {
        setData(jsonData);
      }
    } catch (error) {
      console.error('[AnalyticsPage] fetch failed:', error);
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [period, selectedTourId]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('admin-analytics-realtime');

    const refreshAnalytics = () => {
      void fetchAnalytics();
    };

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analytics_logs' },
        refreshAnalytics
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, refreshAnalytics)
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [fetchAnalytics]);

  const dailyData = data?.daily ?? EMPTY_DAILY;
  const tourData = data?.tours ?? EMPTY_TOURS;
  const availableTours = data?.availableTours ?? EMPTY_FILTERS;
  const overview = data?.overview ?? {
    total_tours: 0,
    total_plays: 0,
    unique_sessions: 0,
    tracked_tours: 0,
  };

  useEffect(() => {
    if (!tourData.length) {
      setFocusedTourId('');
      return;
    }

    const currentExists = tourData.some((tour) => tour.id === focusedTourId);
    if (currentExists) {
      return;
    }

    setFocusedTourId(tourData[0]?.id ?? '');
  }, [focusedTourId, tourData]);

  const maxActivity = Math.max(
    ...dailyData.map((day) => Math.max(day.total_tours, day.total_plays, day.unique_sessions)),
    1
  );

  const derived = useMemo(() => {
    const totalManualPlays = tourData.reduce((sum, tour) => sum + tour.manual_plays, 0);
    const totalAutoPlays = tourData.reduce((sum, tour) => sum + tour.auto_plays, 0);
    const totalSkips = tourData.reduce((sum, tour) => sum + tour.skips, 0);
    const totalCompletedTours = tourData.reduce((sum, tour) => sum + tour.completed_tours, 0);
    const completionRate = overview.total_tours
      ? (totalCompletedTours / overview.total_tours) * 100
      : 0;
    const manualShare = overview.total_plays ? (totalManualPlays / overview.total_plays) * 100 : 0;
    const autoShare = overview.total_plays ? (totalAutoPlays / overview.total_plays) * 100 : 0;
    const skipPressure = overview.total_tours ? (totalSkips / overview.total_tours) * 100 : 0;
    const avgPlaysPerSession = overview.unique_sessions
      ? overview.total_plays / overview.unique_sessions
      : 0;
    const avgCompletionAcrossTours = tourData.length
      ? tourData.reduce((sum, tour) => sum + tour.completion_rate, 0) / tourData.length
      : 0;
    const avgDuration = (() => {
      const totalWeightedDuration = tourData.reduce((sum, tour) => {
        if (!tour.avg_duration_min) return sum;
        return sum + tour.avg_duration_min * Math.max(tour.sessions, 1);
      }, 0);
      const totalWeightedSessions = tourData.reduce((sum, tour) => {
        if (!tour.avg_duration_min) return sum;
        return sum + Math.max(tour.sessions, 1);
      }, 0);

      if (!totalWeightedSessions) return null;
      return Math.round(totalWeightedDuration / totalWeightedSessions);
    })();

    const rankedByPlays = [...tourData].sort(
      (a, b) => b.total_plays - a.total_plays || b.sessions - a.sessions
    );
    const rankedByCompletion = [...tourData]
      .filter((tour) => tour.starts > 0)
      .sort((a, b) => b.completion_rate - a.completion_rate || b.sessions - a.sessions);
    const rankedBySkipPressure = [...tourData]
      .filter((tour) => tour.starts > 0)
      .sort((a, b) => getSkipPressure(b) - getSkipPressure(a));
    const rankedByEfficiency = [...tourData]
      .filter((tour) => tour.sessions > 0)
      .sort((a, b) => getPlaysPerSession(b) - getPlaysPerSession(a));

    const opportunityTours = [...tourData]
      .filter((tour) => tour.starts > 0)
      .sort((a, b) => {
        const scoreA = getSkipPressure(a) + (100 - a.completion_rate);
        const scoreB = getSkipPressure(b) + (100 - b.completion_rate);
        return scoreB - scoreA;
      })
      .slice(0, 4);

    return {
      totalManualPlays,
      totalAutoPlays,
      totalSkips,
      totalCompletedTours,
      completionRate,
      manualShare,
      autoShare,
      skipPressure,
      avgPlaysPerSession,
      avgCompletionAcrossTours,
      avgDuration,
      rankedByPlays,
      rankedByCompletion,
      rankedBySkipPressure,
      rankedByEfficiency,
      opportunityTours,
    };
  }, [overview.total_plays, overview.total_tours, overview.unique_sessions, tourData]);

  const leaderboard = useMemo(() => {
    const items = [...tourData];

    switch (leaderboardSort) {
      case 'sessions':
        return items.sort((a, b) => b.sessions - a.sessions || b.total_plays - a.total_plays);
      case 'completion':
        return items.sort(
          (a, b) => b.completion_rate - a.completion_rate || b.sessions - a.sessions
        );
      case 'skipPressure':
        return items.sort((a, b) => getSkipPressure(b) - getSkipPressure(a) || b.skips - a.skips);
      default:
        return items.sort((a, b) => b.total_plays - a.total_plays || b.sessions - a.sessions);
    }
  }, [leaderboardSort, tourData]);

  const focusedTour = tourData.find((tour) => tour.id === focusedTourId) ?? leaderboard[0] ?? null;
  const topTour = derived.rankedByPlays[0] ?? null;
  const conversionLeader = derived.rankedByCompletion[0] ?? null;
  const skipLeader = derived.rankedBySkipPressure[0] ?? null;
  const efficiencyLeader = derived.rankedByEfficiency[0] ?? null;

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-primary h-10 w-10 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-8 text-sm text-red-100">
        Không thể tải dữ liệu phân tích. Hãy thử làm mới lại trang.
      </div>
    );
  }

  const overviewCards = [
    {
      label: 'Lượt bắt đầu tour',
      value: formatNumber(overview.total_tours),
      note: `${formatNumber(overview.tracked_tours)} tour có dữ liệu`,
      accent: 'text-white',
    },
    {
      label: 'Lượt phát âm thanh',
      value: formatNumber(overview.total_plays),
      note: `${formatPercent(derived.autoShare)} tự động • ${formatPercent(derived.manualShare)} thủ công`,
      accent: 'text-primary',
    },
    {
      label: 'Phiên người dùng',
      value: formatNumber(overview.unique_sessions),
      note: `${derived.avgPlaysPerSession.toFixed(1)} lượt phát / phiên`,
      accent: 'text-sky-300',
    },
    {
      label: 'Hoàn tất tổng',
      value: formatPercent(derived.completionRate),
      note: `${formatNumber(derived.totalCompletedTours)} lần hoàn tất tour`,
      accent: 'text-emerald-300',
    },
    {
      label: 'Áp lực bỏ qua',
      value: formatPercent(derived.skipPressure),
      note: `${formatNumber(derived.totalSkips)} lượt bỏ qua`,
      accent: 'text-amber-200',
    },
    {
      label: 'Thời lượng thực tế',
      value: derived.avgDuration ? `${derived.avgDuration} phút` : 'Chưa đủ dữ liệu',
      note: `${formatPercent(derived.avgCompletionAcrossTours)} tỷ lệ hoàn tất trung bình theo tour`,
      accent: 'text-violet-200',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-primary/80 text-xs font-semibold tracking-[0.32em] uppercase">
            Phân tích và chẩn đoán
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">Phân tích điều hành tour</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Tập trung vào hành vi nghe thực tế, tỷ lệ hoàn tất, áp lực bỏ qua và tour nào đang đóng
            góp tốt nhất hoặc cần được chỉnh nội dung ngay.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7days', label: '7 ngày' },
              { value: '30days', label: '30 ngày' },
              { value: 'all', label: 'Toàn bộ' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  period === item.value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <select
            value={selectedTourId}
            onChange={(event) => setSelectedTourId(event.target.value)}
            className="focus:border-primary/40 min-w-[240px] rounded-xl border border-white/10 bg-[#2c1e16] px-4 py-2 text-sm text-white outline-none"
          >
            <option value="">Tất cả tour</option>
            {availableTours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name_vi}
                {tour.is_active ? '' : ' (đang ẩn)'}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void fetchAnalytics()}
            className="bg-primary rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600"
          >
            Làm mới
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5 shadow-lg"
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
            <p className="mt-3 text-xs leading-5 text-gray-400">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-primary text-sm font-semibold">Nhịp theo ngày</p>
              <h2 className="mt-1 text-xl font-black text-white">Hoạt động theo ngày</h2>
              <p className="mt-2 text-sm text-gray-400">
                So sánh lượt bắt đầu, lượt phát và số phiên để nhìn ra ngày nào đang hút người dùng
                nhất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] tracking-[0.22em] text-gray-500 uppercase">
              <span className="flex items-center gap-2">
                <span className="bg-primary h-2.5 w-2.5 rounded-full" />
                Bắt đầu
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-300" />
                Lượt phát
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                Phiên
              </span>
            </div>
          </div>

          <div className="mt-8 flex h-72 items-end gap-2">
            {dailyData.map((day) => (
              <div
                key={day.date}
                className="group relative flex min-w-0 flex-1 flex-col items-center gap-3"
              >
                <div className="flex h-full w-full items-end justify-center gap-1">
                  {[
                    { value: day.total_tours, tone: 'bg-primary/45 group-hover:bg-primary/75' },
                    {
                      value: day.total_plays,
                      tone: 'bg-orange-300/45 group-hover:bg-orange-300/80',
                    },
                    { value: day.unique_sessions, tone: 'bg-sky-300/45 group-hover:bg-sky-300/80' },
                  ].map((bar, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className={`w-1/3 rounded-t-md transition-colors ${bar.tone}`}
                      style={{
                        height: `${(bar.value / maxActivity) * 100}%`,
                        minHeight: bar.value > 0 ? 6 : 0,
                      }}
                    />
                  ))}
                </div>

                <div className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-black/90 px-3 py-2 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {formatNumber(day.total_tours)} lượt bắt đầu
                  <br />
                  {formatNumber(day.total_plays)} lượt phát
                  <br />
                  {formatNumber(day.unique_sessions)} phiên
                </div>

                <span className="w-full truncate text-center text-[10px] text-gray-500">
                  {new Date(day.date).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
            ))}

            {dailyData.length === 0 && (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                Không có dữ liệu trong giai đoạn này.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2c1e16]">
            {topTour ? (
              <div className="relative aspect-[16/9] bg-black/20">
                {topTour.cover_image_url ? (
                  <Image
                    src={topTour.cover_image_url}
                    alt={topTour.name_vi}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="from-primary/20 flex h-full w-full items-center justify-center bg-gradient-to-br to-black/20">
                    <span className="text-primary/35 text-6xl font-black">T</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-6 py-6">
                  <p className="text-primary text-sm font-semibold">Top tour theo lượt phát</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{topTour.name_vi}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
                    <span className="rounded-full bg-black/40 px-3 py-1">
                      {formatNumber(topTour.total_plays)} lượt phát
                    </span>
                    <span className="rounded-full bg-black/40 px-3 py-1">
                      {formatNumber(topTour.sessions)} phiên
                    </span>
                    <span className="rounded-full bg-black/40 px-3 py-1">
                      Hoàn tất {topTour.completion_rate}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center px-6 text-center text-sm text-gray-500">
                Chưa có tour nào đủ dữ liệu để làm điểm nhấn.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <p className="text-primary text-sm font-semibold">Tóm tắt theo kỳ</p>
            <h2 className="mt-1 text-xl font-black text-white">Điểm nổi bật trong kỳ</h2>

            <div className="mt-5 space-y-3">
              {[
                {
                  title: 'Giữ chân tốt nhất',
                  value: conversionLeader
                    ? `${conversionLeader.name_vi} • ${conversionLeader.completion_rate}%`
                    : 'Chưa có dữ liệu',
                  note: conversionLeader
                    ? `${formatNumber(conversionLeader.completed_tours)} lần hoàn tất trên ${formatNumber(conversionLeader.starts)} lượt bắt đầu`
                    : 'Cần thêm lượt sử dụng để so sánh tỷ lệ hoàn tất',
                },
                {
                  title: 'Cần xem lại nội dung',
                  value: skipLeader
                    ? `${skipLeader.name_vi} • ${formatPercent(getSkipPressure(skipLeader))}`
                    : 'Chưa có dữ liệu',
                  note: skipLeader
                    ? `${formatNumber(skipLeader.skips)} lượt bỏ qua, ${formatNumber(skipLeader.total_plays)} lượt phát`
                    : 'Áp lực bỏ qua sẽ hiện khi có đủ lượt bắt đầu tour',
                },
                {
                  title: 'Nghe sâu nhất mỗi phiên',
                  value: efficiencyLeader
                    ? `${efficiencyLeader.name_vi} • ${getPlaysPerSession(efficiencyLeader).toFixed(1)} lượt phát / phiên`
                    : 'Chưa có dữ liệu',
                  note: efficiencyLeader
                    ? 'Tín hiệu tốt để xem xét đẩy tour này lên bảng điều hành hoặc trang đích'
                    : 'Chưa đủ phiên để tính độ sâu mỗi phiên',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4"
                >
                  <p className="text-xs tracking-[0.24em] text-gray-500 uppercase">{item.title}</p>
                  <p className="mt-2 font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-primary text-sm font-semibold">Bảng cơ hội cải thiện</p>
              <h2 className="mt-1 text-xl font-black text-white">Tour cần ưu tiên tối ưu</h2>
            </div>
            <span className="text-xs text-gray-400">{derived.opportunityTours.length} tour</span>
          </div>

          <div className="mt-5 space-y-3">
            {derived.opportunityTours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => setFocusedTourId(tour.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                  focusedTourId === tour.id
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-white/10 bg-black/15 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{tour.name_vi}</p>
                    <p className="mt-2 text-sm text-gray-400">
                      Hoàn tất {tour.completion_rate}% • Bỏ qua{' '}
                      {formatPercent(getSkipPressure(tour))}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">
                    {formatNumber(tour.skips)} lượt
                  </span>
                </div>
              </button>
            ))}

            {derived.opportunityTours.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                Chưa có tour nào cần cảnh báo đặc biệt trong kỳ này.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-primary text-sm font-semibold">Bảng xếp hạng</p>
              <h2 className="mt-1 text-xl font-black text-white">Bảng xếp hạng tour</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'plays', label: 'Theo lượt phát' },
                { value: 'sessions', label: 'Theo số phiên' },
                { value: 'completion', label: 'Theo hoàn tất' },
                { value: 'skipPressure', label: 'Theo mức bỏ qua' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLeaderboardSort(item.value as LeaderboardSort)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                    leaderboardSort === item.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-3">
              {leaderboard.map((tour, index) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setFocusedTourId(tour.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                    focusedTour?.id === tour.id
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-white/10 bg-black/15 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="text-primary flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 text-sm font-black">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{tour.name_vi}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatNumber(tour.total_plays)} lượt phát • {formatNumber(tour.sessions)}{' '}
                          phiên
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-300">
                      {tour.completion_rate}%
                    </span>
                  </div>
                </button>
              ))}

              {leaderboard.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                  Chưa có dữ liệu tour để xếp hạng.
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
              {focusedTour ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-primary text-sm font-semibold">Chẩn đoán chi tiết</p>
                      <h3 className="mt-1 text-2xl font-black text-white">{focusedTour.name_vi}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        {focusedTour.poi_count} POI •{' '}
                        {formatDuration(focusedTour.estimated_duration_min)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        focusedTour.is_active
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {focusedTour.is_active ? 'Đang mở' : 'Đang ẩn'}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Bắt đầu', value: formatNumber(focusedTour.starts) },
                      { label: 'Phiên', value: formatNumber(focusedTour.sessions) },
                      { label: 'Tổng lượt phát', value: formatNumber(focusedTour.total_plays) },
                      {
                        label: 'Thời lượng TB',
                        value: formatDuration(focusedTour.avg_duration_min),
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-black/20 px-4 py-4">
                        <p className="text-[11px] tracking-[0.22em] text-gray-500 uppercase">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-4">
                    {[
                      {
                        label: 'Hoàn tất',
                        value: focusedTour.completion_rate,
                        tone: 'from-emerald-400 to-emerald-300',
                        note: `${formatNumber(focusedTour.completed_tours)} lần hoàn tất`,
                      },
                      {
                        label: 'Tỷ trọng thủ công',
                        value: focusedTour.total_plays
                          ? (focusedTour.manual_plays / focusedTour.total_plays) * 100
                          : 0,
                        tone: 'from-primary to-orange-300',
                        note: `${formatNumber(focusedTour.manual_plays)} / ${formatNumber(focusedTour.total_plays)} lượt phát`,
                      },
                      {
                        label: 'Áp lực bỏ qua',
                        value: getSkipPressure(focusedTour),
                        tone: 'from-amber-300 to-amber-200',
                        note: `${formatNumber(focusedTour.skips)} lượt bỏ qua`,
                      },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-white">{metric.label}</span>
                          <span className="font-semibold text-gray-300">
                            {formatPercent(metric.value)}
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${metric.tone}`}
                            style={{
                              width: `${metric.value === 0 ? 0 : Math.max(4, Math.min(metric.value, 100))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">{metric.note}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center text-sm text-gray-500">
                  Chọn một tour để xem chẩn đoán chi tiết.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2c1e16]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold">Bảng chẩn đoán tour</p>
            <h2 className="mt-1 text-xl font-black text-white">Bảng số liệu chi tiết theo tour</h2>
          </div>
          <p className="text-sm text-gray-400">
            Dùng bảng này để rà nhanh số phiên, lượt phát, tự động/thủ công, lượt bỏ qua và tỷ lệ
            hoàn tất của từng tour.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-black/10 text-left text-xs tracking-wide text-gray-400 uppercase">
              <tr>
                <th className="px-6 py-3">Tour</th>
                <th className="px-6 py-3">Phiên</th>
                <th className="px-6 py-3">Lượt phát</th>
                <th className="px-6 py-3">Tự động / Thủ công</th>
                <th className="px-6 py-3">Bỏ qua</th>
                <th className="px-6 py-3">Hoàn tất</th>
                <th className="px-6 py-3">Hoàn tất</th>
                <th className="px-6 py-3">TG trung bình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tourData.map((tour) => (
                <tr
                  key={tour.id}
                  className={`transition-colors hover:bg-white/5 ${focusedTour?.id === tour.id ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setFocusedTourId(tour.id)}
                      className="flex min-w-[260px] items-center gap-3 text-left"
                    >
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/20">
                        {tour.cover_image_url ? (
                          <Image
                            src={tour.cover_image_url}
                            alt={tour.name_vi}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="from-primary/15 text-primary/50 flex h-full w-full items-center justify-center bg-gradient-to-br to-black/20">
                            <span className="text-lg font-black">T</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{tour.name_vi}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              tour.is_active
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {tour.is_active ? 'Đang mở' : 'Đang ẩn'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {tour.poi_count} POI
                          {typeof tour.estimated_duration_min === 'number'
                            ? ` • ${tour.estimated_duration_min} phút`
                            : ''}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    {formatNumber(tour.sessions)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    {formatNumber(tour.total_plays)}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {formatNumber(tour.auto_plays)} / {formatNumber(tour.manual_plays)}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{formatNumber(tour.skips)}</td>
                  <td className="px-6 py-4 text-gray-300">{formatNumber(tour.completed_tours)}</td>
                  <td className="text-primary px-6 py-4 font-semibold">{tour.completion_rate}%</td>
                  <td className="px-6 py-4 text-gray-300">
                    {formatDuration(tour.avg_duration_min)}
                  </td>
                </tr>
              ))}

              {tourData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Chưa có dữ liệu phân tích theo tour.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
