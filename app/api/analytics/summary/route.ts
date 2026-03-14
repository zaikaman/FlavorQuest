import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface AnalyticsLogRow {
    id: string;
    event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
    session_id: string | null;
    poi_id: string | null;
    timestamp: string;
    listen_duration: number | null;
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

const ANALYTICS_PAGE_SIZE = 1000;

async function fetchAnalyticsLogsInRange(
    supabase: Awaited<ReturnType<typeof createServerClient>>,
    startIso: string,
    endIso: string,
) {
    const allLogs: AnalyticsLogRow[] = [];
    let from = 0;

    while (true) {
        const to = from + ANALYTICS_PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from('analytics_logs')
            .select('id, event_type, session_id, poi_id, timestamp, listen_duration, completed, metadata')
            .gte('timestamp', startIso)
            .lte('timestamp', endIso)
            .order('timestamp', { ascending: true })
            .range(from, to);

        if (error) {
            throw error;
        }

        const page = (data ?? []) as unknown as AnalyticsLogRow[];
        allLogs.push(...page);

        if (page.length < ANALYTICS_PAGE_SIZE) {
            break;
        }

        from += ANALYTICS_PAGE_SIZE;
    }

    return allLogs;
}

/**
 * GET /api/analytics/summary
 * Fetch analytics summary (admin only)
 */
export async function GET(request: NextRequest) {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);

    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || '30days'; // 7days, 30days, all
        const selectedTourId = searchParams.get('tour_id');

        // Calculate date range
        const now = new Date();
        let startDate = new Date(now);
        startDate.setUTCHours(0, 0, 0, 0);

        if (period === '7days') {
            startDate.setUTCDate(startDate.getUTCDate() - 6);
        } else if (period === '30days') {
            startDate.setUTCDate(startDate.getUTCDate() - 29);
        } else {
            startDate = new Date(0); // All time
        }

        const [{ data: tours, error: toursError }, logs] = await Promise.all([
            supabase
                .from('tours')
                .select('id, name_vi, cover_image_url, estimated_duration_min, poi_ids, is_active')
                .is('deleted_at', null)
                .order('created_at', { ascending: false }),
            fetchAnalyticsLogsInRange(supabase, startDate.toISOString(), now.toISOString()),
        ]);

        if (toursError) {
            const message = toursError.message || 'Failed to fetch analytics';
            return NextResponse.json({ error: message }, { status: 500 });
        }

        const logRows = logs;
        const tourRows = (tours ?? []) as unknown as TourRow[];
        const dailyMap = new Map<string, { date: string; total_tours: number; total_plays: number; sessions: Set<string> }>();
        const poiToTourIds = new Map<string, string[]>();

        const tourStatsMap = new Map<string, TourStatsAccumulator>(tourRows.map(tour => [tour.id, {
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
        }]));

        for (const tour of tourRows) {
            for (const poiId of tour.poi_ids) {
                const current = poiToTourIds.get(poiId) ?? [];
                current.push(tour.id);
                poiToTourIds.set(poiId, current);
            }
        }

        for (const log of logRows) {
            const metadata = log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                ? log.metadata
                : null;

            let relatedTourIds: string[] = [];
            if (metadata && typeof metadata.tour_id === 'string') {
                relatedTourIds = [metadata.tour_id];
            } else if (log.poi_id) {
                const inferredTourIds = poiToTourIds.get(log.poi_id) ?? [];
                if (inferredTourIds.length === 1) {
                    relatedTourIds = inferredTourIds;
                }
            }

            const isIncludedByFilter = !selectedTourId || relatedTourIds.includes(selectedTourId);

            if (isIncludedByFilter) {
                const dayKey = log.timestamp.slice(0, 10);
                const daily = dailyMap.get(dayKey) ?? {
                    date: dayKey,
                    total_tours: 0,
                    total_plays: 0,
                    sessions: new Set<string>(),
                };

                if (log.session_id) {
                    daily.sessions.add(log.session_id);
                }

                if (log.event_type === 'tour_start') {
                    daily.total_tours += 1;
                }

                if (log.event_type === 'auto_play' || log.event_type === 'manual_play') {
                    daily.total_plays += 1;
                }

                dailyMap.set(dayKey, daily);
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
                    if (metadata && typeof metadata.duration === 'number') {
                        stats.totalDurationMs += metadata.duration;
                        stats.durationCount += 1;
                    }
                }
            }
        }

        const dailyEntries = Array.from(dailyMap.values())
            .map(item => ({
                date: item.date,
                total_tours: item.total_tours,
                total_plays: item.total_plays,
                unique_sessions: item.sessions.size,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const daily = period === 'all'
            ? dailyEntries
            : (() => {
                const filled: typeof dailyEntries = [];
                const cursor = new Date(startDate);
                cursor.setUTCHours(0, 0, 0, 0);
                const dailyByDate = new Map(dailyEntries.map(item => [item.date, item]));

                while (cursor <= now) {
                    const dateKey = cursor.toISOString().slice(0, 10);
                    filled.push(dailyByDate.get(dateKey) ?? {
                        date: dateKey,
                        total_tours: 0,
                        total_plays: 0,
                        unique_sessions: 0,
                    });
                    cursor.setUTCDate(cursor.getUTCDate() + 1);
                }

                return filled;
            })();

        const toursSummary = Array.from(tourStatsMap.values())
            .map(item => ({
                id: item.id,
                name_vi: item.name_vi,
                cover_image_url: item.cover_image_url,
                estimated_duration_min: item.estimated_duration_min,
                poi_count: item.poi_count,
                is_active: item.is_active,
                starts: Math.max(item.starts, item.startedSessions.size),
                sessions: item.sessionsSet.size,
                total_plays: item.total_plays,
                auto_plays: item.auto_plays,
                manual_plays: item.manual_plays,
                skips: item.skips,
                completed_tours: Math.max(item.completed_tours, item.completedSessions.size),
                completion_rate: Math.max(item.starts, item.startedSessions.size) > 0
                    ? Math.round((Math.max(item.completed_tours, item.completedSessions.size) / Math.max(item.starts, item.startedSessions.size)) * 100)
                    : 0,
                avg_duration_min: item.durationCount > 0
                    ? Math.round((item.totalDurationMs / item.durationCount) / 60000)
                    : null,
            }))
            .filter(item => !selectedTourId || item.id === selectedTourId)
            .sort((a, b) => b.total_plays - a.total_plays || b.sessions - a.sessions);

        const overview = {
            total_tours: selectedTourId
                ? toursSummary.reduce((sum, item) => sum + item.starts, 0)
                : daily.reduce((sum, item) => sum + item.total_tours, 0),
            total_plays: daily.reduce((sum, item) => sum + item.total_plays, 0),
            unique_sessions: new Set(
                logRows
                    .filter(log => {
                        if (!selectedTourId) return true;
                        const metadata = log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                            ? log.metadata
                            : null;
                        if (metadata && typeof metadata.tour_id === 'string') {
                            return metadata.tour_id === selectedTourId;
                        }
                        if (!log.poi_id) return false;
                        const inferredTourIds = poiToTourIds.get(log.poi_id) ?? [];
                        return inferredTourIds.includes(selectedTourId);
                    })
                    .map(item => item.session_id)
                    .filter((sessionId): sessionId is string => Boolean(sessionId))
            ).size,
            tracked_tours: toursSummary.filter(item => item.sessions > 0).length,
        };

        return NextResponse.json({
            overview,
            daily,
            tours: toursSummary,
            availableTours: tourRows.map(tour => ({
                id: tour.id,
                name_vi: tour.name_vi,
                is_active: tour.is_active,
            })),
            selectedTourId,
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
