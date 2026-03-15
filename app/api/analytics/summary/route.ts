import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient, isUserAdmin } from '@/lib/supabase/server';

type AnalyticsEventType =
  | 'tour_start'
  | 'tour_end'
  | 'auto_play'
  | 'manual_play'
  | 'skip'
  | 'settings_change';

interface AnalyticsLogRow {
  event_type: AnalyticsEventType;
  session_id: string | null;
  poi_id: string | null;
  timestamp: string;
  language: string | null;
  completed: boolean | null;
  metadata: Record<string, unknown> | null;
}

interface TourRow {
  id: string;
  name_vi: string;
  cover_image_url: string | null;
  estimated_duration_min: number | null;
  poi_ids: string[];
  is_active: boolean;
}

interface PoiRow {
  id: string;
  name_vi: string;
  image_url: string | null;
  audio_url_vi: string | null;
  audio_url_en: string | null;
  audio_url_ja: string | null;
  audio_url_fr: string | null;
  audio_url_ko: string | null;
  audio_url_zh: string | null;
  name_en: string | null;
  name_ja: string | null;
  name_fr: string | null;
  name_ko: string | null;
  name_zh: string | null;
  owner_id: string | null;
  deleted_at: string | null;
}

interface UserRow {
  id: string;
  role: string | null;
  created_at: string;
  customer_access_granted: boolean;
  customer_access_granted_at: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';
  paid_at: string | null;
  created_at: string;
}

interface TourStatsAccumulator {
  id: string;
  name_vi: string;
  cover_image_url: string | null;
  estimated_duration_min: number | null;
  poi_count: number;
  is_active: boolean;
  starts: number;
  total_plays: number;
  auto_plays: number;
  manual_plays: number;
  skips: number;
  completed_tours: number;
  sessionsSet: Set<string>;
  startedSessions: Set<string>;
  completedSessions: Set<string>;
  totalDurationMs: number;
  durationCount: number;
}

interface PoiStatsAccumulator {
  id: string;
  name_vi: string;
  image_url: string | null;
  owner_id: string | null;
  has_image: boolean;
  has_audio_vi: boolean;
  plays: number;
  skips: number;
  sessionsSet: Set<string>;
  completionSignals: number;
  completedSignals: number;
}

interface SessionAccumulator {
  id: string;
  firstTimestamp: number;
  lastTimestamp: number;
  plays: number;
  skips: number;
  starts: number;
  completedTours: number;
  languages: Set<string>;
  durationMs: number | null;
}

const ANALYTICS_PAGE_SIZE = 1000;
const DEFAULT_PERIOD = '30days';
const PERIOD_WITH_FILLED_DATES = new Set(['7days', '30days']);
const ANALYTICS_SUMMARY_CACHE_TTL_MS = 30_000;
const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  fr: 'Français',
  ko: '한국어',
  zh: '中文',
};

const analyticsSummaryCache = new Map<string, { payload: unknown; cachedAt: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getPeriodWindow(period: string) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);

  if (period === '7days') {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
  } else if (period === '30days') {
    startDate.setUTCDate(startDate.getUTCDate() - 29);
  } else {
    return { period: 'all', startDate: new Date(0), now };
  }

  return { period, startDate, now };
}

function normalizeRole(role: string | null | undefined) {
  if (role === 'admin' || role === 'owner' || role === 'customer') {
    return role;
  }

  if (role === 'user') {
    return 'customer';
  }

  return 'customer';
}

function getTourIdFromMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return null;
  return typeof metadata.tour_id === 'string' ? metadata.tour_id : null;
}

function getDurationFromMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return null;
  return typeof metadata.duration === 'number' ? metadata.duration : null;
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function getAnalyticsCacheKey(period: string, selectedTourId: string | null) {
  return `${period}:${selectedTourId ?? 'all'}`;
}

function incrementDateMap<T>(map: Map<string, T>, key: string, createValue: () => T) {
  const current = map.get(key) ?? createValue();
  map.set(key, current);
  return current;
}

function finalizeTimeline<T>(
  map: Map<string, T>,
  startDate: Date,
  endDate: Date,
  period: string,
  createEmpty: (date: string) => T
) {
  const items = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  if (!PERIOD_WITH_FILLED_DATES.has(period)) {
    return items;
  }

  const filled: T[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const dateKey = cursor.toISOString().slice(0, 10);
    filled.push(map.get(dateKey) ?? createEmpty(dateKey));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return filled;
}

async function fetchAnalyticsLogsInRange(
  adminClient: ReturnType<typeof createAdminClient>,
  startIso: string,
  endIso: string
) {
  const allLogs: AnalyticsLogRow[] = [];
  let from = 0;

  while (true) {
    const to = from + ANALYTICS_PAGE_SIZE - 1;
    const { data, error } = await adminClient
      .from('analytics_logs')
      .select('event_type, session_id, poi_id, timestamp, language, completed, metadata')
      .gte('timestamp', startIso)
      .lte('timestamp', endIso)
      .order('timestamp', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as AnalyticsLogRow[];
    allLogs.push(...page);

    if (page.length < ANALYTICS_PAGE_SIZE) {
      break;
    }

    from += ANALYTICS_PAGE_SIZE;
  }

  return allLogs;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const admin = await isUserAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedPeriod = searchParams.get('period') || DEFAULT_PERIOD;
    const selectedTourId = searchParams.get('tour_id');
    const { period, startDate, now } = getPeriodWindow(requestedPeriod);
    const cacheKey = getAnalyticsCacheKey(period, selectedTourId);
    const cachedSummary = analyticsSummaryCache.get(cacheKey);

    if (cachedSummary && Date.now() - cachedSummary.cachedAt < ANALYTICS_SUMMARY_CACHE_TTL_MS) {
      return NextResponse.json(cachedSummary.payload);
    }

    const adminClient = createAdminClient();

    const [toursResult, poisResult, usersResult, paymentsResult, analyticsLogs] = await Promise.all([
      adminClient
        .from('tours')
        .select('id, name_vi, cover_image_url, estimated_duration_min, poi_ids, is_active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      adminClient
        .from('pois')
        .select(
          'id, name_vi, image_url, audio_url_vi, audio_url_en, audio_url_ja, audio_url_fr, audio_url_ko, audio_url_zh, name_en, name_ja, name_fr, name_ko, name_zh, owner_id, deleted_at'
        )
        .order('priority', { ascending: false }),
      adminClient
        .from('users')
        .select('id, role, created_at, customer_access_granted, customer_access_granted_at'),
      adminClient
        .from('customer_access_payments')
        .select('id, amount, status, paid_at, created_at')
        .order('created_at', { ascending: false }),
      fetchAnalyticsLogsInRange(adminClient, startDate.toISOString(), now.toISOString()),
    ]);

    if (toursResult.error) {
      return NextResponse.json({ error: toursResult.error.message }, { status: 500 });
    }

    if (poisResult.error) {
      return NextResponse.json({ error: poisResult.error.message }, { status: 500 });
    }

    if (usersResult.error) {
      return NextResponse.json({ error: usersResult.error.message }, { status: 500 });
    }

    if (paymentsResult.error) {
      return NextResponse.json({ error: paymentsResult.error.message }, { status: 500 });
    }

    const tourRows = (toursResult.data ?? []) as TourRow[];
    const poiRows = (poisResult.data ?? []) as PoiRow[];
    const userRows = (usersResult.data ?? []) as UserRow[];
    const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];

    const dailyMap = new Map<
      string,
      { date: string; total_tours: number; total_plays: number; sessions: Set<string> }
    >();
    const userTimelineMap = new Map<string, { date: string; new_users: number; new_unlocks: number }>();
    const paymentTimelineMap = new Map<
      string,
      { date: string; paid_count: number; pending_count: number; paid_revenue: number }
    >();
    const hourlyMap = new Map<
      number,
      { hour: number; total_tours: number; total_plays: number; sessions: Set<string> }
    >();
    const languageMap = new Map<string, { code: string; plays: number; sessions: Set<string> }>();
    const eventCounts = new Map<AnalyticsEventType, number>();
    const sessionMap = new Map<string, SessionAccumulator>();
    const poiToTourIds = new Map<string, string[]>();
    const poiStatsMap = new Map<string, PoiStatsAccumulator>();
    const selectedSessionIds = new Set<string>();

    const tourStatsMap = new Map<string, TourStatsAccumulator>(
      tourRows.map((tour) => [
        tour.id,
        {
          id: tour.id,
          name_vi: tour.name_vi,
          cover_image_url: tour.cover_image_url,
          estimated_duration_min: tour.estimated_duration_min,
          poi_count: tour.poi_ids.length,
          is_active: tour.is_active,
          starts: 0,
          total_plays: 0,
          auto_plays: 0,
          manual_plays: 0,
          skips: 0,
          completed_tours: 0,
          sessionsSet: new Set<string>(),
          startedSessions: new Set<string>(),
          completedSessions: new Set<string>(),
          totalDurationMs: 0,
          durationCount: 0,
        },
      ])
    );

    for (const poi of poiRows) {
      poiStatsMap.set(poi.id, {
        id: poi.id,
        name_vi: poi.name_vi,
        image_url: poi.image_url,
        owner_id: poi.owner_id,
        has_image: Boolean(poi.image_url),
        has_audio_vi: Boolean(poi.audio_url_vi),
        plays: 0,
        skips: 0,
        sessionsSet: new Set<string>(),
        completionSignals: 0,
        completedSignals: 0,
      });
    }

    for (const tour of tourRows) {
      for (const poiId of tour.poi_ids) {
        const current = poiToTourIds.get(poiId) ?? [];
        current.push(tour.id);
        poiToTourIds.set(poiId, current);
      }
    }

    for (const log of analyticsLogs) {
      const metadata = isRecord(log.metadata) ? log.metadata : null;
      const metadataTourId = getTourIdFromMetadata(metadata);

      let relatedTourIds: string[] = [];
      if (metadataTourId) {
        relatedTourIds = [metadataTourId];
      } else if (log.poi_id) {
        const inferredTourIds = poiToTourIds.get(log.poi_id) ?? [];
        if (inferredTourIds.length === 1) {
          relatedTourIds = inferredTourIds;
        }
      }

      const matchesSelectedTour = !selectedTourId || relatedTourIds.includes(selectedTourId);
      const dayKey = getDateKey(log.timestamp);
      const hour = new Date(log.timestamp).getUTCHours();
      const hourlyItem =
        hourlyMap.get(hour) ??
        {
          hour,
          total_tours: 0,
          total_plays: 0,
          sessions: new Set<string>(),
        };
      hourlyMap.set(hour, hourlyItem);

      eventCounts.set(log.event_type, (eventCounts.get(log.event_type) ?? 0) + 1);

      if (log.language) {
        const langItem =
          languageMap.get(log.language) ??
          { code: log.language, plays: 0, sessions: new Set<string>() };
        if (log.session_id) {
          langItem.sessions.add(log.session_id);
        }
        if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
          langItem.plays += 1;
        }
        languageMap.set(log.language, langItem);
      }

      if (matchesSelectedTour) {
        if (log.session_id) {
          selectedSessionIds.add(log.session_id);
        }

        const dailyItem = incrementDateMap(dailyMap, dayKey, () => ({
          date: dayKey,
          total_tours: 0,
          total_plays: 0,
          sessions: new Set<string>(),
        }));

        if (log.session_id) {
          dailyItem.sessions.add(log.session_id);
        }

        if (log.event_type === 'tour_start') {
          dailyItem.total_tours += 1;
        }

        if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
          dailyItem.total_plays += 1;
        }
      }

      if (log.session_id) {
        const currentSession =
          sessionMap.get(log.session_id) ??
          {
            id: log.session_id,
            firstTimestamp: Number.POSITIVE_INFINITY,
            lastTimestamp: 0,
            plays: 0,
            skips: 0,
            starts: 0,
            completedTours: 0,
            languages: new Set<string>(),
            durationMs: null,
          };

        const currentTimestamp = new Date(log.timestamp).getTime();
        currentSession.firstTimestamp = Math.min(currentSession.firstTimestamp, currentTimestamp);
        currentSession.lastTimestamp = Math.max(currentSession.lastTimestamp, currentTimestamp);

        if (log.language) {
          currentSession.languages.add(log.language);
        }

        if (log.event_type === 'tour_start') {
          currentSession.starts += 1;
          hourlyItem.total_tours += 1;
        }

        if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
          currentSession.plays += 1;
          hourlyItem.total_plays += 1;
        }

        if (log.event_type === 'skip') {
          currentSession.skips += 1;
        }

        if (log.event_type === 'tour_end') {
          currentSession.completedTours += 1;
          const durationMs = getDurationFromMetadata(metadata);
          if (typeof durationMs === 'number') {
            currentSession.durationMs = Math.max(currentSession.durationMs ?? 0, durationMs);
          }
        }

        hourlyItem.sessions.add(log.session_id);
        sessionMap.set(log.session_id, currentSession);
      } else {
        if (log.event_type === 'tour_start') {
          hourlyItem.total_tours += 1;
        }

        if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
          hourlyItem.total_plays += 1;
        }
      }

      if (log.poi_id) {
        const poiStats = poiStatsMap.get(log.poi_id);
        if (poiStats) {
          if (log.session_id) {
            poiStats.sessionsSet.add(log.session_id);
          }

          if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
            poiStats.plays += 1;
          }

          if (log.event_type === 'skip') {
            poiStats.skips += 1;
          }

          if (typeof log.completed === 'boolean') {
            poiStats.completionSignals += 1;
            if (log.completed) {
              poiStats.completedSignals += 1;
            }
          }
        }
      }

      for (const tourId of relatedTourIds) {
        const stats = tourStatsMap.get(tourId);
        if (!stats) continue;

        if (log.session_id) {
          stats.sessionsSet.add(log.session_id);
        }

        if (log.event_type === 'tour_start') {
          if (log.session_id) {
            stats.startedSessions.add(log.session_id);
          } else {
            stats.starts += 1;
          }
        }

        if (log.event_type === 'auto_play') {
          if (log.session_id) {
            stats.startedSessions.add(log.session_id);
          }
          stats.auto_plays += 1;
          stats.total_plays += 1;
        }

        if (log.event_type === 'manual_play') {
          if (log.session_id) {
            stats.startedSessions.add(log.session_id);
          }
          stats.manual_plays += 1;
          stats.total_plays += 1;
        }

        if (log.event_type === 'skip') {
          if (log.session_id) {
            stats.startedSessions.add(log.session_id);
          }
          stats.skips += 1;
        }

        if (log.event_type === 'tour_end') {
          if (log.session_id) {
            stats.startedSessions.add(log.session_id);
            stats.completedSessions.add(log.session_id);
          } else {
            stats.completed_tours += 1;
          }

          const durationMs = getDurationFromMetadata(metadata);
          if (typeof durationMs === 'number') {
            stats.totalDurationMs += durationMs;
            stats.durationCount += 1;
          }
        }
      }
    }

    const rawDailyEntries = Array.from(dailyMap.values())
      .map((item) => ({
        date: item.date,
        total_tours: item.total_tours,
        total_plays: item.total_plays,
        unique_sessions: item.sessions.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyEntries: Array<{
      date: string;
      total_tours: number;
      total_plays: number;
      unique_sessions: number;
    }> =
      PERIOD_WITH_FILLED_DATES.has(period)
        ? (() => {
            const filled: Array<{
              date: string;
              total_tours: number;
              total_plays: number;
              unique_sessions: number;
            }> = [];
            const dailyByDate = new Map(rawDailyEntries.map((item) => [item.date, item]));
            const cursor = new Date(startDate);
            cursor.setUTCHours(0, 0, 0, 0);

            while (cursor <= now) {
              const dateKey = cursor.toISOString().slice(0, 10);
              filled.push(
                dailyByDate.get(dateKey) ?? {
                  date: dateKey,
                  total_tours: 0,
                  total_plays: 0,
                  unique_sessions: 0,
                }
              );
              cursor.setUTCDate(cursor.getUTCDate() + 1);
            }

            return filled;
          })()
        : rawDailyEntries;

    const toursSummary = Array.from(tourStatsMap.values())
      .map((item) => {
        const starts = Math.max(item.starts, item.startedSessions.size);
        const completedTours = Math.max(item.completed_tours, item.completedSessions.size);

        return {
          id: item.id,
          name_vi: item.name_vi,
          cover_image_url: item.cover_image_url,
          estimated_duration_min: item.estimated_duration_min,
          poi_count: item.poi_count,
          is_active: item.is_active,
          starts,
          sessions: item.sessionsSet.size,
          total_plays: item.total_plays,
          auto_plays: item.auto_plays,
          manual_plays: item.manual_plays,
          skips: item.skips,
          completed_tours: completedTours,
          completion_rate: starts > 0 ? Math.round((completedTours / starts) * 100) : 0,
          avg_duration_min:
            item.durationCount > 0 ? Math.round(item.totalDurationMs / item.durationCount / 60000) : null,
        };
      })
      .filter((item) => !selectedTourId || item.id === selectedTourId)
      .sort((a, b) => b.total_plays - a.total_plays || b.sessions - a.sessions);

    const overview = {
      total_tours: selectedTourId
        ? toursSummary.reduce((sum, item) => sum + item.starts, 0)
        : dailyEntries.reduce((sum, item) => sum + item.total_tours, 0),
      total_plays: dailyEntries.reduce((sum, item) => sum + item.total_plays, 0),
      unique_sessions: selectedSessionIds.size,
      tracked_tours: toursSummary.filter((item) => item.sessions > 0).length,
    };

    const totalAutoPlays = toursSummary.reduce((sum, tour) => sum + tour.auto_plays, 0);
    const totalManualPlays = toursSummary.reduce((sum, tour) => sum + tour.manual_plays, 0);
    const totalSkips = toursSummary.reduce((sum, tour) => sum + tour.skips, 0);
    const totalCompletedTours = toursSummary.reduce((sum, tour) => sum + tour.completed_tours, 0);

    const sessionValues = Array.from(sessionMap.values()).map((session) => {
      const fallbackDuration = Math.max(0, session.lastTimestamp - session.firstTimestamp);
      const durationMs = session.durationMs ?? fallbackDuration;
      return { ...session, durationMs };
    });

    const avgSessionDurationMin = sessionValues.length
      ? Math.round(
          sessionValues.reduce((sum, session) => sum + session.durationMs, 0) /
            sessionValues.length /
            60000
        )
      : null;

    const sessionSegmentsRaw = [
      {
        key: 'quick',
        label: 'Lướt nhanh',
        note: 'Người dùng chỉ nghe rất ngắn rồi rời đi, nên xem lại phần mở đầu của hành trình.',
        count: sessionValues.filter(
          (session) => session.plays <= 1 && session.completedTours === 0 && session.durationMs < 5 * 60000
        ).length,
      },
      {
        key: 'engaged',
        label: 'Khám phá',
        note: 'Người dùng đã ở lại đủ lâu để nghe thêm, cho thấy hành trình đang giữ được sự tò mò.',
        count: sessionValues.filter(
          (session) =>
            (session.plays >= 2 || session.durationMs >= 5 * 60000) &&
            session.completedTours === 0 &&
            session.durationMs < 18 * 60000
        ).length,
      },
      {
        key: 'deep',
        label: 'Đi sâu',
        note: 'Người dùng nghe nhiều, ở lại lâu hoặc đã đi hết tour.',
        count: sessionValues.filter(
          (session) =>
            session.completedTours > 0 || session.plays >= 6 || session.durationMs >= 18 * 60000
        ).length,
      },
    ];

    const accountedSessionCount = sessionSegmentsRaw.reduce((sum, item) => sum + item.count, 0);
    const engagedSegment = sessionSegmentsRaw[1];
    if (engagedSegment && sessionValues.length > accountedSessionCount) {
      engagedSegment.count += sessionValues.length - accountedSessionCount;
    }

    const sessionSegments = sessionSegmentsRaw.map((item) => ({
      ...item,
      share: sessionValues.length ? Math.round((item.count / sessionValues.length) * 100) : 0,
    }));

    const languages = Array.from(languageMap.values())
      .map((item) => ({
        code: item.code,
        label: LANGUAGE_LABELS[item.code] ?? item.code.toUpperCase(),
        sessions: item.sessions.size,
        plays: item.plays,
        share: overview.total_plays ? Math.round((item.plays / overview.total_plays) * 100) : 0,
      }))
      .sort((a, b) => b.plays - a.plays || b.sessions - a.sessions);

    const events = (
      [
        { type: 'tour_start', label: 'Bắt đầu tour' },
        { type: 'tour_end', label: 'Kết thúc tour' },
        { type: 'auto_play', label: 'Tự động phát' },
        { type: 'manual_play', label: 'Phát thủ công' },
        { type: 'skip', label: 'Bỏ qua' },
        { type: 'settings_change', label: 'Đổi cài đặt' },
      ] as const
    ).map((item) => {
      const count = eventCounts.get(item.type) ?? 0;
      return {
        type: item.type,
        label: item.label,
        count,
        share: analyticsLogs.length ? Math.round((count / analyticsLogs.length) * 100) : 0,
      };
    });

    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const item = hourlyMap.get(hour);
      return {
        hour,
        total_tours: item?.total_tours ?? 0,
        total_plays: item?.total_plays ?? 0,
        unique_sessions: item?.sessions.size ?? 0,
      };
    });

    const topPois = Array.from(poiStatsMap.values())
      .map((item) => ({
        id: item.id,
        name_vi: item.name_vi,
        image_url: item.image_url,
        owner_id: item.owner_id,
        has_image: item.has_image,
        has_audio_vi: item.has_audio_vi,
        plays: item.plays,
        sessions: item.sessionsSet.size,
        skips: item.skips,
        skip_rate: item.plays > 0 ? Math.round((item.skips / item.plays) * 100) : 0,
        completion_signals: item.completionSignals,
        completion_rate:
          item.completionSignals > 0
            ? Math.round((item.completedSignals / item.completionSignals) * 100)
            : 0,
      }))
      .filter((item) => item.plays > 0 || item.skips > 0)
      .sort((a, b) => b.plays - a.plays || b.sessions - a.sessions);

    const poiOpportunities = [...topPois]
      .filter((item) => item.plays >= 3 || item.skips >= 2)
      .sort((a, b) => b.skip_rate - a.skip_rate || b.skips - a.skips)
      .slice(0, 6);

    const activePois = poiRows.filter((poi) => !poi.deleted_at);
    const totalCustomers = userRows.filter((user) => normalizeRole(user.role) === 'customer').length;
    const unlockedCustomers = userRows.filter((user) => user.customer_access_granted).length;

    const poisWithFullLanguageNames = activePois.filter((poi) =>
      [poi.name_en, poi.name_ja, poi.name_fr, poi.name_ko, poi.name_zh].every(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    ).length;
    const poisWithFullLanguageAudio = activePois.filter((poi) =>
      [poi.audio_url_en, poi.audio_url_ja, poi.audio_url_fr, poi.audio_url_ko, poi.audio_url_zh].every(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    ).length;

    const content = {
      total_pois: poiRows.length,
      active_pois: activePois.length,
      hidden_pois: poiRows.length - activePois.length,
      owned_pois: activePois.filter((poi) => Boolean(poi.owner_id)).length,
      orphan_pois: activePois.filter((poi) => !poi.owner_id).length,
      total_tours: tourRows.length,
      active_tours: tourRows.filter((tour) => tour.is_active).length,
      hidden_tours: tourRows.filter((tour) => !tour.is_active).length,
      tours_with_cover: tourRows.filter((tour) => Boolean(tour.cover_image_url)).length,
      pois_with_image: activePois.filter((poi) => Boolean(poi.image_url)).length,
      pois_with_audio_vi: activePois.filter((poi) => Boolean(poi.audio_url_vi)).length,
      pois_with_full_language_names: poisWithFullLanguageNames,
      pois_with_full_language_audio: poisWithFullLanguageAudio,
      avg_pois_per_tour: tourRows.length
        ? Number(
            (
              tourRows.reduce((sum, tour) => sum + tour.poi_ids.length, 0) / tourRows.length
            ).toFixed(1)
          )
        : 0,
    };

    const contentGaps = [
      {
        label: 'POI thiếu ảnh',
        count: activePois.filter((poi) => !poi.image_url).length,
        note: 'Thiếu ảnh khiến phần hiển thị kém hấp dẫn và khó tạo ấn tượng ban đầu.',
        route: '/admin/pois',
      },
      {
        label: 'POI thiếu audio tiếng Việt',
        count: activePois.filter((poi) => !poi.audio_url_vi).length,
        note: 'Đây là phần thiếu ảnh hưởng trực tiếp đến trải nghiệm nghe cốt lõi.',
        route: '/admin/pois',
      },
      {
        label: 'POI chưa có owner',
        count: activePois.filter((poi) => !poi.owner_id).length,
        note: 'Không có người phụ trách rõ ràng thì việc cập nhật và phản hồi thường bị chậm.',
        route: '/admin/pois',
      },
      {
        label: 'POI chưa đủ tên đa ngôn ngữ',
        count: activePois.length - poisWithFullLanguageNames,
        note: 'Nếu muốn phục vụ khách quốc tế tốt hơn thì đây là nhóm nên hoàn thiện sớm.',
        route: '/admin/pois',
      },
      {
        label: 'Tour thiếu ảnh bìa',
        count: tourRows.filter((tour) => !tour.cover_image_url).length,
        note: 'Không có ảnh bìa thì tour khó nổi bật và kém thuyết phục hơn trong danh sách.',
        route: '/admin/tours',
      },
      {
        label: 'Tour đang ẩn',
        count: tourRows.filter((tour) => !tour.is_active).length,
        note: 'Nên rà lại các tour đã gần xong nhưng vẫn chưa được mở cho người dùng.',
        route: '/admin/tours',
      },
    ].sort((a, b) => b.count - a.count);

    const audience = {
      total_users: userRows.length,
      customers: totalCustomers,
      owners: userRows.filter((user) => normalizeRole(user.role) === 'owner').length,
      admins: userRows.filter((user) => normalizeRole(user.role) === 'admin').length,
      unlocked_customers: unlockedCustomers,
      access_rate: totalCustomers ? Math.round((unlockedCustomers / totalCustomers) * 100) : 0,
      new_users_in_period: userRows.filter(
        (user) => new Date(user.created_at).getTime() >= startDate.getTime()
      ).length,
      new_unlocks_in_period: userRows.filter((user) => {
        if (!user.customer_access_granted_at) return false;
        return new Date(user.customer_access_granted_at).getTime() >= startDate.getTime();
      }).length,
    };

    for (const user of userRows) {
      const createdAt = new Date(user.created_at);
      if (createdAt.getTime() >= startDate.getTime()) {
        const dateKey = getDateKey(user.created_at);
        const item = incrementDateMap(userTimelineMap, dateKey, () => ({
          date: dateKey,
          new_users: 0,
          new_unlocks: 0,
        }));
        item.new_users += 1;
      }

      if (user.customer_access_granted_at) {
        const grantedAt = new Date(user.customer_access_granted_at);
        if (grantedAt.getTime() >= startDate.getTime()) {
          const dateKey = getDateKey(user.customer_access_granted_at);
          const item = incrementDateMap(userTimelineMap, dateKey, () => ({
            date: dateKey,
            new_users: 0,
            new_unlocks: 0,
          }));
          item.new_unlocks += 1;
        }
      }
    }

    const payments = {
      total: paymentRows.length,
      paid: paymentRows.filter((payment) => payment.status === 'PAID').length,
      pending: paymentRows.filter((payment) =>
        ['PENDING', 'PROCESSING', 'UNDERPAID'].includes(payment.status)
      ).length,
      cancelled: paymentRows.filter((payment) =>
        ['CANCELLED', 'EXPIRED'].includes(payment.status)
      ).length,
      failed: paymentRows.filter((payment) => payment.status === 'FAILED').length,
      total_revenue: paymentRows
        .filter((payment) => payment.status === 'PAID')
        .reduce((sum, payment) => sum + payment.amount, 0),
      revenue_in_period: paymentRows
        .filter((payment) => payment.status === 'PAID' && payment.paid_at)
        .filter((payment) => new Date(payment.paid_at as string).getTime() >= startDate.getTime())
        .reduce((sum, payment) => sum + payment.amount, 0),
      average_paid_order: 0,
    };

    payments.average_paid_order = payments.paid
      ? Math.round(payments.total_revenue / payments.paid)
      : 0;

    for (const payment of paymentRows) {
      const effectiveDate = payment.paid_at ?? payment.created_at;
      const currentDate = new Date(effectiveDate);
      if (currentDate.getTime() < startDate.getTime()) {
        continue;
      }

      const dateKey = getDateKey(effectiveDate);
      const item = incrementDateMap(paymentTimelineMap, dateKey, () => ({
        date: dateKey,
        paid_count: 0,
        pending_count: 0,
        paid_revenue: 0,
      }));

      if (payment.status === 'PAID') {
        item.paid_count += 1;
        item.paid_revenue += payment.amount;
      }

      if (['PENDING', 'PROCESSING', 'UNDERPAID'].includes(payment.status)) {
        item.pending_count += 1;
      }
    }

    const userTimeline = finalizeTimeline(userTimelineMap, startDate, now, period, (date) => ({
      date,
      new_users: 0,
      new_unlocks: 0,
    }));

    const paymentTimeline = finalizeTimeline(paymentTimelineMap, startDate, now, period, (date) => ({
      date,
      paid_count: 0,
      pending_count: 0,
      paid_revenue: 0,
    }));

    const journey = {
      total_manual_plays: totalManualPlays,
      total_auto_plays: totalAutoPlays,
      total_skips: totalSkips,
      total_completed_tours: totalCompletedTours,
      completion_rate:
        overview.total_tours > 0 ? Math.round((totalCompletedTours / overview.total_tours) * 100) : 0,
      manual_share:
        overview.total_plays > 0 ? Math.round((totalManualPlays / overview.total_plays) * 100) : 0,
      auto_share:
        overview.total_plays > 0 ? Math.round((totalAutoPlays / overview.total_plays) * 100) : 0,
      skip_rate: overview.total_plays > 0 ? Math.round((totalSkips / overview.total_plays) * 100) : 0,
      avg_plays_per_session:
        overview.unique_sessions > 0
          ? Number((overview.total_plays / overview.unique_sessions).toFixed(1))
          : 0,
      avg_session_duration_min: avgSessionDurationMin,
    };

    const payload = {
      overview,
      daily: dailyEntries,
      tours: toursSummary,
      availableTours: tourRows.map((tour) => ({
        id: tour.id,
        name_vi: tour.name_vi,
        is_active: tour.is_active,
      })),
      selectedTourId,
      hourly,
      events,
      languages,
      sessionSegments,
      journey,
      audience,
      userTimeline,
      payments,
      paymentTimeline,
      content,
      contentGaps,
      pois: {
        leaders: topPois.slice(0, 6),
        opportunities: poiOpportunities,
      },
    };

    analyticsSummaryCache.set(cacheKey, {
      payload,
      cachedAt: Date.now(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[analytics/summary] failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
