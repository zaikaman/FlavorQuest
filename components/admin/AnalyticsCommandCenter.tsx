'use client';

import Image from 'next/image';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Loading';

type LeaderboardSort = 'plays' | 'sessions' | 'completion' | 'skipPressure';

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

interface HourlyActivity {
  hour: number;
  total_tours: number;
  total_plays: number;
  unique_sessions: number;
}

interface HeatmapCell {
  hour: number;
  plays: number;
  unique_sessions: number;
  total_tours: number;
}

interface HeatmapDay {
  date: string;
  label: string;
  cells: HeatmapCell[];
}

interface HeatmapSummary {
  timezone: string;
  metric: 'plays';
  maxValue: number;
  days: HeatmapDay[];
}

interface EventMixItem {
  type: string;
  label: string;
  count: number;
  share: number;
}

interface LanguageItem {
  code: string;
  label: string;
  sessions: number;
  plays: number;
  share: number;
}

interface SessionSegment {
  key: string;
  label: string;
  note: string;
  count: number;
  share: number;
}

interface JourneySummary {
  total_manual_plays: number;
  total_auto_plays: number;
  total_skips: number;
  total_completed_tours: number;
  completion_rate: number;
  manual_share: number;
  auto_share: number;
  skip_rate: number;
  avg_plays_per_session: number;
  avg_session_duration_min: number | null;
}

interface AudienceSummary {
  total_users: number;
  customers: number;
  owners: number;
  admins: number;
  new_users_in_period: number;
}

interface TimelinePoint {
  date: string;
}

interface UserTimelinePoint extends TimelinePoint {
  new_users: number;
}

interface ContentSummary {
  total_pois: number;
  active_pois: number;
  hidden_pois: number;
  owned_pois: number;
  orphan_pois: number;
  total_tours: number;
  active_tours: number;
  hidden_tours: number;
  tours_with_cover: number;
  pois_with_image: number;
  pois_with_audio_vi: number;
  pois_with_full_language_names: number;
  pois_with_full_language_audio: number;
  avg_pois_per_tour: number;
}

interface ContentGapItem {
  label: string;
  count: number;
  note: string;
  route: string;
}

interface PoiInsightItem {
  id: string;
  name_vi: string;
  image_url: string | null;
  owner_id: string | null;
  has_image: boolean;
  has_audio_vi: boolean;
  plays: number;
  sessions: number;
  skips: number;
  skip_rate: number;
  completion_signals: number;
  completion_rate: number;
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
  hourly: HourlyActivity[];
  heatmap: HeatmapSummary;
  events: EventMixItem[];
  languages: LanguageItem[];
  sessionSegments: SessionSegment[];
  journey: JourneySummary;
  audience: AudienceSummary;
  userTimeline: UserTimelinePoint[];
  content: ContentSummary;
  contentGaps: ContentGapItem[];
  pois: {
    leaders: PoiInsightItem[];
    opportunities: PoiInsightItem[];
  };
}

const EMPTY_ARRAY: never[] = [];
const EMPTY_HEATMAP: HeatmapSummary = {
  timezone: 'Asia/Ho_Chi_Minh',
  metric: 'plays',
  maxValue: 0,
  days: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDuration(value: number | null) {
  return value ? `${value} phút` : 'Chưa đủ dữ liệu';
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-');
  return day && month ? `${day}/${month}` : value;
}

function formatFullDate(value: string) {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function getSkipPressure(tour: TourAnalyticsItem) {
  if (!tour.starts) return 0;
  return (tour.skips / tour.starts) * 100;
}

function getPlaysPerSession(tour: TourAnalyticsItem) {
  if (!tour.sessions) return 0;
  return tour.total_plays / tour.sessions;
}

function getTimelineMax<T>(items: T[], mapper: (item: T) => number) {
  return Math.max(...items.map(mapper), 1);
}

function getHeatmapTone(value: number, maxValue: number) {
  if (!value || maxValue <= 0) {
    return 'border-white/5 bg-[#241711] hover:bg-[#2d1d15]';
  }

  const ratio = value / maxValue;

  if (ratio >= 0.8) {
    return 'border-orange-200/40 bg-[#f58220] hover:bg-[#ff9a46]';
  }

  if (ratio >= 0.6) {
    return 'border-orange-300/30 bg-[#d96b24] hover:bg-[#e97b35]';
  }

  if (ratio >= 0.4) {
    return 'border-orange-500/25 bg-[#a95220] hover:bg-[#bb642f]';
  }

  if (ratio >= 0.2) {
    return 'border-orange-700/20 bg-[#71361c] hover:bg-[#884427]';
  }

  return 'border-orange-900/20 bg-[#48261a] hover:bg-[#5a3121]';
}

function MiniTimeline<T extends TimelinePoint>({
  items,
  title,
  subtitle,
  primaryLabel,
  primaryValue,
  primaryTone,
  secondaryLabel,
  secondaryValue,
  secondaryTone,
}: {
  items: T[];
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryValue: (item: T) => number;
  primaryTone: string;
  secondaryLabel?: string;
  secondaryValue?: (item: T) => number;
  secondaryTone?: string;
}) {
  const hasSecondary = Boolean(secondaryLabel && secondaryValue && secondaryTone);
  const maxValue = getTimelineMax(items, (item) =>
    Math.max(primaryValue(item), hasSecondary && secondaryValue ? secondaryValue(item) : 0)
  );

  return (
    <div className="rounded-[26px] border border-white/10 bg-[#2c1e16] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-gray-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${primaryTone}`} />
            {primaryLabel}
          </span>
          {hasSecondary && (
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${secondaryTone}`} />
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2 [scrollbar-color:rgba(245,130,32,0.55)_rgba(255,255,255,0.08)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb:hover]:bg-primary/80">
        <div
          className="grid min-w-full gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item) => (
            <div key={item.date} className="group flex min-w-0 flex-col items-center gap-3">
              <div className="flex h-36 w-full items-end justify-center gap-1">
                <div
                  className={`${hasSecondary ? 'w-1/2' : 'w-full'} rounded-t-md ${primaryTone}`}
                  style={{
                    height: `${(primaryValue(item) / maxValue) * 100}%`,
                    minHeight: primaryValue(item) > 0 ? 6 : 0,
                  }}
                />
                {hasSecondary && secondaryValue && secondaryTone ? (
                  <div
                    className={`w-1/2 rounded-t-md ${secondaryTone}`}
                    style={{
                      height: `${(secondaryValue(item) / maxValue) * 100}%`,
                      minHeight: secondaryValue(item) > 0 ? 6 : 0,
                    }}
                  />
                ) : null}
              </div>
              <span className="w-full truncate text-center text-[10px] text-gray-500">
                {formatShortDate(item.date)}
              </span>
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex h-36 w-full items-center justify-center text-sm text-gray-500">
              Chưa có dữ liệu trong giai đoạn này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityHeatmap({ heatmap }: { heatmap: HeatmapSummary }) {
  const hasRows = heatmap.days.length > 0;
  const legendLevels = [1, 2, 3, 4, 5];

  return (
    <div className="mt-8 rounded-[24px] border border-white/10 bg-black/15 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">Heatmap nghe theo ngày x giờ</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Ô càng nóng thì số lượt nghe trong khung đó càng cao. Mỗi ô vẫn giữ số phiên và lượt bắt
            đầu tour để đọc đúng ngữ cảnh thay vì chỉ nhìn màu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">
          <span>Thấp</span>
          <div className="flex items-center gap-1.5">
            {legendLevels.map((level) => (
              <span
                key={level}
                className={`h-3.5 w-3.5 rounded-[4px] border ${getHeatmapTone(level, 5)}`}
              />
            ))}
          </div>
          <span>Cao</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Múi giờ báo cáo: {heatmap.timezone}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Đỉnh ô: {formatNumber(heatmap.maxValue)} lượt nghe
        </span>
      </div>

      {hasRows ? (
        <div className="mt-6 overflow-x-auto pb-2 [scrollbar-color:rgba(245,130,32,0.55)_rgba(255,255,255,0.08)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb:hover]:bg-primary/80">
          <div
            className="grid min-w-[760px] gap-1.5"
            style={{
              gridTemplateColumns: '72px repeat(24, minmax(18px, 1fr))',
            }}
          >
            <div className="flex items-end pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">
              Ngày
            </div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={`hour-${hour}`}
                className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                {String(hour).padStart(2, '0')}
              </div>
            ))}

            {heatmap.days.map((day) => (
              <Fragment key={day.date}>
                <div className="flex items-center pr-2 text-xs font-semibold text-gray-300">
                  {day.label}
                </div>
                {day.cells.map((cell) => {
                  const cellLabel = `${formatFullDate(day.date)} ${formatHour(cell.hour)}: ${formatNumber(cell.plays)} lượt nghe, ${formatNumber(cell.unique_sessions)} phiên, ${formatNumber(cell.total_tours)} lượt bắt đầu tour.`;

                  return (
                    <div
                      key={`${day.date}-${cell.hour}`}
                      role="img"
                      aria-label={cellLabel}
                      title={cellLabel}
                      className={`aspect-square min-h-[18px] rounded-[6px] border transition-transform duration-150 hover:scale-[1.04] ${getHeatmapTone(cell.plays, heatmap.maxValue)}`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-gray-400">
          Chưa có dữ liệu để dựng heatmap trong giai đoạn này.
        </div>
      )}
    </div>
  );
}

export default function AnalyticsCommandCenter() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [period, setPeriod] = useState('30days');
  const [selectedTourId, setSelectedTourId] = useState('');
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('plays');
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ period });
      if (selectedTourId) {
        params.set('tour_id', selectedTourId);
      }
      const response = await fetch(`/api/analytics/summary?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Không thể tải trung tâm phân tích');
      }

      const jsonData = (await response.json()) as AnalyticsSummaryResponse;
      if (requestId === latestRequestRef.current && !abortController.signal.aborted) {
        setData(jsonData);
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      console.error('[AnalyticsCommandCenter] fetch failed:', error);
    } finally {
      if (requestId === latestRequestRef.current && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [period, selectedTourId]);

  useEffect(() => {
    void fetchAnalytics();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchAnalytics]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('admin-analytics-command-center');

    const refreshAnalytics = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void fetchAnalytics();
      }, 400);
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_logs' }, refreshAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, refreshAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pois' }, refreshAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refreshAnalytics)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      void channel.unsubscribe();
    };
  }, [fetchAnalytics]);

  const dailyData = data?.daily ?? EMPTY_ARRAY;
  const hourlyData = data?.hourly ?? EMPTY_ARRAY;
  const heatmap = data?.heatmap ?? EMPTY_HEATMAP;
  const tourData = data?.tours ?? EMPTY_ARRAY;
  const events = data?.events ?? EMPTY_ARRAY;
  const languages = data?.languages ?? EMPTY_ARRAY;
  const sessionSegments = data?.sessionSegments ?? EMPTY_ARRAY;
  const availableTours = data?.availableTours ?? EMPTY_ARRAY;
  const userTimeline = data?.userTimeline ?? EMPTY_ARRAY;
  const contentGaps = data?.contentGaps ?? EMPTY_ARRAY;
  const poiLeaders = data?.pois.leaders ?? EMPTY_ARRAY;
  const poiOpportunities = data?.pois.opportunities ?? EMPTY_ARRAY;

  const overview = data?.overview ?? {
    total_tours: 0,
    total_plays: 0,
    unique_sessions: 0,
    tracked_tours: 0,
  };
  const journey = data?.journey ?? {
    total_manual_plays: 0,
    total_auto_plays: 0,
    total_skips: 0,
    total_completed_tours: 0,
    completion_rate: 0,
    manual_share: 0,
    auto_share: 0,
    skip_rate: 0,
    avg_plays_per_session: 0,
    avg_session_duration_min: null,
  };
  const audience = data?.audience ?? {
    total_users: 0,
    customers: 0,
    owners: 0,
    admins: 0,
    new_users_in_period: 0,
  };
  const content = data?.content ?? {
    total_pois: 0,
    active_pois: 0,
    hidden_pois: 0,
    owned_pois: 0,
    orphan_pois: 0,
    total_tours: 0,
    active_tours: 0,
    hidden_tours: 0,
    tours_with_cover: 0,
    pois_with_image: 0,
    pois_with_audio_vi: 0,
    pois_with_full_language_names: 0,
    pois_with_full_language_audio: 0,
    avg_pois_per_tour: 0,
  };

  useEffect(() => {
    if (!tourData.length) {
      if (selectedTourId) {
        setSelectedTourId('');
      }
      return;
    }

    if (selectedTourId && !tourData.some((tour) => tour.id === selectedTourId)) {
      setSelectedTourId('');
    }
  }, [selectedTourId, tourData]);

  const leaderboard = useMemo(() => {
    const items = [...tourData];

    switch (leaderboardSort) {
      case 'sessions':
        return items.sort((a, b) => b.sessions - a.sessions || b.total_plays - a.total_plays);
      case 'completion':
        return items.sort((a, b) => b.completion_rate - a.completion_rate || b.sessions - a.sessions);
      case 'skipPressure':
        return items.sort((a, b) => getSkipPressure(b) - getSkipPressure(a) || b.skips - a.skips);
      default:
        return items.sort((a, b) => b.total_plays - a.total_plays || b.sessions - a.sessions);
    }
  }, [leaderboardSort, tourData]);

  const focusedTour =
    tourData.find((tour) => tour.id === selectedTourId) ?? leaderboard[0] ?? null;
  const topTour = leaderboard[0] ?? null;
  const topLanguage = languages[0] ?? null;
  const topGap = contentGaps[0] ?? null;
  const topPoi = poiLeaders[0] ?? null;
  const topHour = [...hourlyData].sort(
    (a, b) => b.total_plays + b.total_tours - (a.total_plays + a.total_tours)
  )[0] ?? null;

  const opportunityTours = useMemo(() => {
    return [...tourData]
      .filter((tour) => tour.starts > 0)
      .sort((a, b) => {
        const scoreA = getSkipPressure(a) + (100 - a.completion_rate);
        const scoreB = getSkipPressure(b) + (100 - b.completion_rate);
        return scoreB - scoreA;
      })
      .slice(0, 4);
  }, [tourData]);

  const overviewCards = [
    {
      label: 'Phiên hành trình',
      value: formatNumber(overview.unique_sessions),
      note: `${journey.avg_plays_per_session.toFixed(1)} lượt phát / phiên`,
      accent: 'text-white',
      border: 'border-white/10',
    },
    {
      label: 'Âm thanh được phát',
      value: formatNumber(overview.total_plays),
      note: `${formatPercent(journey.auto_share)} tự động • ${formatPercent(journey.manual_share)} thủ công`,
      accent: 'text-primary',
      border: 'border-primary/20',
    },
    {
      label: 'Tour được bắt đầu',
      value: formatNumber(overview.total_tours),
      note: `${formatNumber(overview.tracked_tours)} tour có tín hiệu hoạt động`,
      accent: 'text-sky-300',
      border: 'border-sky-400/20',
    },
    {
      label: 'Hoàn tất tour',
      value: formatPercent(journey.completion_rate),
      note: `${formatNumber(journey.total_completed_tours)} lần kết thúc tour`,
      accent: 'text-emerald-300',
      border: 'border-emerald-400/20',
    },
    {
      label: 'Người dùng mới',
      value: formatNumber(audience.new_users_in_period),
      note: `${formatNumber(audience.total_users)} tài khoản hiện có`,
      accent: 'text-amber-200',
      border: 'border-amber-400/20',
    },
    {
      label: 'Khách hàng',
      value: formatNumber(audience.customers),
      note: `${formatNumber(audience.owners)} owner và ${formatNumber(audience.admins)} admin`,
      accent: 'text-violet-200',
      border: 'border-violet-400/20',
    },
  ];

  const contentMeters = [
    {
      label: 'POI có ảnh',
      value: content.pois_with_image,
      total: content.active_pois,
      tone: 'bg-sky-300',
    },
    {
      label: 'POI có audio VI',
      value: content.pois_with_audio_vi,
      total: content.active_pois,
      tone: 'bg-primary',
    },
    {
      label: 'POI đủ tên đa ngôn ngữ',
      value: content.pois_with_full_language_names,
      total: content.active_pois,
      tone: 'bg-violet-300',
    },
    {
      label: 'POI đủ audio đa ngôn ngữ',
      value: content.pois_with_full_language_audio,
      total: content.active_pois,
      tone: 'bg-fuchsia-300',
    },
    {
      label: 'Tour có ảnh bìa',
      value: content.tours_with_cover,
      total: content.total_tours,
      tone: 'bg-emerald-300',
    },
    {
      label: 'POI có chủ quản lý',
      value: content.owned_pois,
      total: content.active_pois,
      tone: 'bg-amber-300',
    },
  ];

  if (isLoading && !data) {
    return (
      <DashboardSkeleton stats={6} />
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-8 text-sm text-red-100">
        Không thể tải dữ liệu phân tích. Hãy thử làm mới lại trang.
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#241711]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <p className="text-primary/80 text-xs font-semibold uppercase tracking-[0.32em]">
              Trung tâm phân tích
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black text-white lg:text-4xl">
              Toàn cảnh vận hành FlavorQuest trong một màn hình
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300">
              Ở đây bạn có thể nhìn cùng lúc hành vi nghe, chất lượng nội dung, hiệu suất tour,
              POI, người dùng và nhịp tăng trưởng, thay vì phải ghép nhiều màn hình rời rạc với nhau.
            </p>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
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
                className="min-w-[260px] rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
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
                {isLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                kicker: 'Ngôn ngữ nổi bật',
                title: topLanguage
                  ? `${topLanguage.label} chiếm ${formatPercent(topLanguage.share)} lượt phát`
                  : 'Chưa có dữ liệu ngôn ngữ',
                body: topLanguage
                  ? `${formatNumber(topLanguage.plays)} lượt phát từ ${formatNumber(topLanguage.sessions)} phiên.`
                  : 'Dữ liệu ngôn ngữ sẽ hiện khi có log phát âm thanh.',
              },
              {
                kicker: 'Điểm cần xử lý',
                title: topGap ? `${topGap.label}: ${formatNumber(topGap.count)}` : 'Kho nội dung đang ổn định',
                body: topGap
                  ? topGap.note
                  : 'Khi có chênh lệch lớn về chất lượng nội dung, khu vực này sẽ nhắc ngay.',
              },
              {
                kicker: 'Khung giờ nổi bật',
                title: topHour ? `${formatHour(topHour.hour)} đang hút mạnh nhất` : 'Chưa có giờ cao điểm',
                body: topHour
                  ? `${formatNumber(topHour.total_plays)} lượt phát và ${formatNumber(topHour.unique_sessions)} phiên trong khung giờ này.`
                  : 'Cần thêm dữ liệu trong kỳ để thấy nhịp theo giờ.',
              },
            ].map((item) => (
              <div
                key={item.kicker}
                className="rounded-[24px] border border-white/10 bg-black/20 p-5"
              >
                <p className="text-primary text-xs font-semibold uppercase tracking-[0.28em]">
                  {item.kicker}
                </p>
                <p className="mt-3 text-lg font-bold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-gray-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-[26px] border ${card.border} bg-[#2c1e16] p-5 shadow-lg`}
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
            <p className="mt-3 text-xs leading-5 text-gray-400">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="min-w-0 overflow-hidden rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-primary text-sm font-semibold">Nhịp sử dụng theo ngày</p>
              <h2 className="mt-1 text-2xl font-black text-white">Lưu lượng sử dụng trong kỳ</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                So sánh lượt bắt đầu tour, lượt phát và số phiên để thấy ngày nào tăng trưởng thật,
                thay vì chỉ nhìn một con số riêng lẻ.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">
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

          <div className="mt-8 overflow-x-auto pb-2 [scrollbar-color:rgba(245,130,32,0.55)_rgba(255,255,255,0.08)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb:hover]:bg-primary/80">
            <div
              className="grid min-w-full items-end gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(dailyData.length, 1)}, minmax(24px, 1fr))`,
              }}
            >
              {dailyData.map((day) => {
                const dayMax = getTimelineMax(dailyData, (item) =>
                  Math.max(item.total_tours, item.total_plays, item.unique_sessions)
                );

                return (
                  <div key={day.date} className="group flex min-w-0 flex-col items-center gap-3">
                    <div className="flex h-64 w-full items-end justify-center gap-1">
                      {[
                        { value: day.total_tours, tone: 'bg-primary/45 group-hover:bg-primary/75' },
                        { value: day.total_plays, tone: 'bg-orange-300/45 group-hover:bg-orange-300/80' },
                        { value: day.unique_sessions, tone: 'bg-sky-300/45 group-hover:bg-sky-300/80' },
                      ].map((bar, index) => (
                        <div
                          key={`${day.date}-${index}`}
                          className={`w-1/3 rounded-t-md transition-colors ${bar.tone}`}
                          style={{
                            height: `${(bar.value / dayMax) * 100}%`,
                            minHeight: bar.value > 0 ? 6 : 0,
                          }}
                        />
                      ))}
                    </div>
                    <span className="w-full truncate text-center text-[10px] text-gray-500">
                      {formatShortDate(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <ActivityHeatmap heatmap={heatmap} />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <p className="text-primary text-sm font-semibold">Hành vi nổi bật</p>
            <h2 className="mt-1 text-xl font-black text-white">Tỷ trọng sự kiện trong kỳ</h2>
            <div className="mt-5 space-y-4">
              {events.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-white">{item.label}</span>
                    <span className="text-gray-300">
                      {formatNumber(item.count)} • {formatPercent(item.share)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.max(item.share, item.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <p className="text-primary text-sm font-semibold">Độ sâu phiên nghe</p>
            <h2 className="mt-1 text-xl font-black text-white">Người dùng đi tới đâu trong hành trình</h2>
            <div className="mt-5 space-y-3">
              {sessionSegments.map((segment) => (
                <div key={segment.key} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{segment.label}</p>
                    <span className="text-sm font-semibold text-gray-300">
                      {formatNumber(segment.count)} • {formatPercent(segment.share)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="from-primary h-full rounded-full bg-gradient-to-r to-orange-300"
                      style={{ width: `${Math.max(segment.share, segment.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{segment.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <p className="text-primary text-sm font-semibold">Ngôn ngữ sử dụng</p>
            <h2 className="mt-1 text-xl font-black text-white">Người dùng đang nghe bằng ngôn ngữ nào</h2>
            <div className="mt-5 space-y-3">
              {languages.map((language) => (
                <div key={language.code} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{language.label}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatNumber(language.sessions)} phiên • {formatNumber(language.plays)} lượt phát
                    </p>
                  </div>
                  <div className="flex min-w-[124px] items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="bg-sky-300 h-full rounded-full"
                        style={{ width: `${Math.max(language.share, language.plays > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-300">
                      {formatPercent(language.share)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Người dùng</p>
                <h2 className="mt-1 text-xl font-black text-white">Tình hình tài khoản</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
                {formatNumber(audience.total_users)} tài khoản
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: 'Khách hàng',
                  value: audience.customers,
                  note: 'Nhóm trải nghiệm tour và nội dung dành cho khách',
                  accent: 'text-white',
                },
                {
                  label: 'Chủ quán',
                  value: audience.owners,
                  note: 'Nhóm phụ trách nội dung tại từng điểm',
                  accent: 'text-sky-300',
                },
                {
                  label: 'Quản trị viên',
                  value: audience.admins,
                  note: 'Nhóm vận hành toàn cục',
                  accent: 'text-violet-200',
                },
                {
                  label: 'Khách mới trong kỳ',
                  value: audience.new_users_in_period,
                  note: 'Số tài khoản mới xuất hiện trong giai đoạn đang xem',
                  accent: 'text-emerald-300',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{item.label}</p>
                  <p className={`mt-3 text-3xl font-black ${item.accent}`}>{formatNumber(item.value)}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <MiniTimeline
            items={userTimeline}
            title="Tăng trưởng người dùng"
            subtitle="Theo dõi nhịp tăng tài khoản mới trong từng giai đoạn để so sánh với hoạt động tour."
            primaryLabel="Tài khoản mới"
            primaryValue={(item) => item.new_users}
            primaryTone="bg-sky-300/70"
          />
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
        <div className="min-w-0 rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
                <p className="text-primary text-sm font-semibold">Chất lượng nội dung</p>
                <h2 className="mt-1 text-xl font-black text-white">Kho nội dung đang khỏe tới đâu</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Nhìn nhanh để biết hệ thống đang thiếu ở đâu: ảnh, audio, đa ngôn ngữ, ảnh bìa tour
                hay người phụ trách.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
              Trung bình {content.avg_pois_per_tour} POI / tour
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {contentMeters.map((item) => {
              const ratio = item.total ? Math.round((item.value / item.total) * 100) : 0;

              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.label}</p>
                    <span className="text-xs font-semibold text-gray-400">{ratio}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${ratio}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    {formatNumber(item.value)} / {formatNumber(item.total)} mục đã sẵn sàng
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-black/15 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-primary text-sm font-semibold">Tổng tài nguyên</p>
                <h3 className="mt-1 text-lg font-black text-white">Những gì đang có trong hệ thống</h3>
              </div>
              <span className="text-xs text-gray-400">
                {formatNumber(content.active_pois)} POI hoạt động • {formatNumber(content.active_tours)} tour mở
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'POI ẩn hoặc gỡ', value: content.hidden_pois },
                { label: 'Tour đang ẩn', value: content.hidden_tours },
                { label: 'POI chưa có chủ quản lý', value: content.orphan_pois },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-black/20 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-black text-white">{formatNumber(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Việc cần xử lý</p>
                <h2 className="mt-1 text-xl font-black text-white">Những điểm nên làm trước</h2>
              </div>
              <span className="text-xs text-gray-400">{contentGaps.length} nhóm vấn đề</span>
            </div>

            <div className="mt-5 space-y-3">
              {contentGaps.map((gap) => (
                <button
                  key={gap.label}
                  type="button"
                  onClick={() => router.push(gap.route)}
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{gap.label}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{gap.note}</p>
                    </div>
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-bold">
                      {formatNumber(gap.count)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Theo dõi POI</p>
                <h2 className="mt-1 text-xl font-black text-white">POI nổi bật và POI cần xem lại</h2>
              </div>
              <span className="text-xs text-gray-400">
                {topPoi ? `${formatNumber(topPoi.plays)} lượt phát ở POI dẫn đầu` : 'Chưa có dữ liệu'}
              </span>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Nghe nhiều nhất</p>
                {poiLeaders.map((poi, index) => (
                  <div key={poi.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-primary flex h-10 w-10 items-center justify-center rounded-2xl bg-black/25 text-sm font-black">
                        {index + 1}
                      </div>
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-black/20">
                        {poi.image_url ? (
                          <Image src={poi.image_url} alt={poi.name_vi} fill unoptimized className="object-cover" />
                        ) : (
                          <div className="from-primary/15 text-primary/50 flex h-full w-full items-center justify-center bg-gradient-to-br to-black/20">
                            <span className="text-sm font-black">P</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{poi.name_vi}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatNumber(poi.sessions)} phiên • bỏ qua {formatPercent(poi.skip_rate)}
                        </p>
                        <p className="mt-2 text-sm text-gray-300">
                          {formatNumber(poi.plays)} lượt phát
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Cần ưu tiên xử lý</p>
                {poiOpportunities.map((poi) => (
                  <div key={poi.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{poi.name_vi}</p>
                        <p className="mt-2 text-sm text-gray-400">
                          Bỏ qua {formatPercent(poi.skip_rate)} • {formatNumber(poi.skips)} lượt bỏ qua
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {poi.has_audio_vi ? 'Có audio VI' : 'Thiếu audio VI'} • {poi.has_image ? 'Có ảnh' : 'Thiếu ảnh'}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">
                        {formatNumber(poi.plays)} lượt phát
                      </span>
                    </div>
                  </div>
                ))}

                {poiOpportunities.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                    Chưa có POI nào rơi vào vùng cảnh báo trong kỳ này.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-primary text-sm font-semibold">Phân tích tour</p>
              <h2 className="mt-1 text-xl font-black text-white">Xếp hạng và chẩn đoán hành trình</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Tour vẫn rất quan trọng, nhưng ở trang này nó được đặt trong bức tranh rộng hơn của
                toàn hệ thống.
              </p>
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

          <div className="mt-6 grid gap-4">
            {leaderboard.map((tour, index) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => setSelectedTourId(tour.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                  selectedTourId === tour.id
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-white/10 bg-black/15 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="text-primary flex h-10 w-10 items-center justify-center rounded-2xl bg-black/25 text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{tour.name_vi}</p>
                      <p className="mt-2 text-sm text-gray-400">
                        {formatNumber(tour.total_plays)} lượt phát • {formatNumber(tour.sessions)} phiên • {tour.poi_count} POI
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-300">
                    {tour.completion_rate}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#2c1e16]">
            {topTour ? (
              <div className="relative aspect-[16/9] bg-black/20">
                {topTour.cover_image_url ? (
                  <Image src={topTour.cover_image_url} alt={topTour.name_vi} fill unoptimized className="object-cover" />
                ) : (
                  <div className="from-primary/20 flex h-full w-full items-center justify-center bg-gradient-to-br to-black/20">
                    <span className="text-primary/35 text-6xl font-black">T</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-6 py-6">
                  <p className="text-primary text-sm font-semibold">Top tour hiện tại</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{topTour.name_vi}</h3>
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
              <div className="flex aspect-[16/9] items-center justify-center text-sm text-gray-500">
                Chưa có tour đủ dữ liệu để tạo điểm nhấn.
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            {focusedTour ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary text-sm font-semibold">Tour được chọn</p>
                    <h3 className="mt-1 text-2xl font-black text-white">{focusedTour.name_vi}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      {focusedTour.poi_count} POI • {formatDuration(focusedTour.estimated_duration_min)}
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
                    { label: 'Lượt phát', value: formatNumber(focusedTour.total_plays) },
                    { label: 'Thời lượng TB', value: formatDuration(focusedTour.avg_duration_min) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-black/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{item.label}</p>
                      <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  {[
                    {
                      label: 'Hoàn tất',
                      value: focusedTour.completion_rate,
                      note: `${formatNumber(focusedTour.completed_tours)} lần hoàn tất`,
                      tone: 'from-emerald-400 to-emerald-300',
                    },
                    {
                      label: 'Lượt phát / phiên',
                      value: Math.min(getPlaysPerSession(focusedTour) * 20, 100),
                      note: `${getPlaysPerSession(focusedTour).toFixed(1)} lượt phát / phiên`,
                      tone: 'from-primary to-orange-300',
                    },
                    {
                      label: 'Áp lực bỏ qua',
                      value: getSkipPressure(focusedTour),
                      note: `${formatNumber(focusedTour.skips)} lượt bỏ qua`,
                      tone: 'from-amber-300 to-amber-200',
                    },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{metric.label}</span>
                        <span className="font-semibold text-gray-300">{formatPercent(metric.value)}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${metric.tone}`}
                          style={{ width: `${Math.max(Math.min(metric.value, 100), metric.value > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{metric.note}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">
                Chọn một tour để xem chẩn đoán chi tiết.
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Cần ưu tiên</p>
                <h2 className="mt-1 text-xl font-black text-white">Tour cần tối ưu trước</h2>
              </div>
              <span className="text-xs text-gray-400">{opportunityTours.length} tour</span>
            </div>
            <div className="mt-5 space-y-3">
              {opportunityTours.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setSelectedTourId(tour.id)}
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{tour.name_vi}</p>
                      <p className="mt-2 text-sm text-gray-400">
                        Hoàn tất {tour.completion_rate}% • bỏ qua {formatPercent(getSkipPressure(tour))}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">
                      {formatNumber(tour.skips)} lượt bỏ qua
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
