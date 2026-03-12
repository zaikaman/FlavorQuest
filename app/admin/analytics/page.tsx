'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

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

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
    const [period, setPeriod] = useState('7days');
    const [selectedTourId, setSelectedTourId] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ period });
            if (selectedTourId) {
                params.set('tour_id', selectedTourId);
            }

            const res = await fetch(`/api/analytics/summary?${params.toString()}`);
            if (res.ok) {
                const jsonData = await res.json() as AnalyticsSummaryResponse;
                setData(jsonData);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [period, selectedTourId]);

    useEffect(() => {
        void fetchAnalytics();
    }, [fetchAnalytics]);

    const dailyData = data?.daily ?? [];
    const tourData = data?.tours ?? [];
    const availableTours = data?.availableTours ?? [];
    const overview = data?.overview ?? {
        total_tours: 0,
        total_plays: 0,
        unique_sessions: 0,
        tracked_tours: 0,
    };

    const maxPlays = Math.max(...dailyData.map(d => d.total_plays), 1);
    const topTour = tourData[0] ?? null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-gray-400">Thống kê hoạt động tổng quan và hiệu suất của từng tour</p>
            </div>

            <div className="flex gap-2">
                <div className="flex gap-2 flex-wrap flex-1">
                    {['7days', '30days', 'all'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            {p === '7days' ? '7 ngày' : p === '30days' ? '30 ngày' : 'Toàn bộ'}
                        </button>
                    ))}
                </div>

                <select
                    value={selectedTourId}
                    onChange={(event) => setSelectedTourId(event.target.value)}
                    className="min-w-[240px] rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                >
                    <option value="">Tất cả tour</option>
                    {availableTours.map(tour => (
                        <option key={tour.id} value={tour.id}>
                            {tour.name_vi}{tour.is_active ? '' : ' (ẩn)'}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Lượt bắt đầu tour</h3>
                    <p className="text-3xl font-bold text-white">{overview.total_tours}</p>
                </div>
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Lượt phát audio</h3>
                    <p className="text-3xl font-bold text-white">{overview.total_plays}</p>
                </div>
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Phiên người dùng</h3>
                    <p className="text-3xl font-bold text-white">{overview.unique_sessions}</p>
                </div>
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Tour có dữ liệu</h3>
                    <p className="text-3xl font-bold text-white">{overview.tracked_tours}</p>
                </div>
            </div>

            {topTour && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                    <div className="bg-[#2c1e16] rounded-xl border border-white/5 overflow-hidden">
                        <div className="relative aspect-[16/7] bg-black/20">
                            {topTour.cover_image_url ? (
                                <Image
                                    src={topTour.cover_image_url}
                                    alt={topTour.name_vi}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/20 to-[#1a1512]">
                                    <span className="material-symbols-outlined text-7xl text-primary/50">route</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute left-6 right-6 bottom-6">
                                <p className="text-sm text-primary font-semibold mb-2">Tour nổi bật theo lượt phát</p>
                                <h2 className="text-2xl font-bold text-white">{topTour.name_vi}</h2>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
                                    <span className="rounded-full bg-black/40 px-3 py-1">{topTour.total_plays} lượt phát</span>
                                    <span className="rounded-full bg-black/40 px-3 py-1">{topTour.sessions} phiên</span>
                                    {typeof topTour.estimated_duration_min === 'number' && (
                                        <span className="rounded-full bg-black/40 px-3 py-1">{topTour.estimated_duration_min} phút</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                        <h3 className="text-white font-bold mb-6">Hoạt động theo ngày</h3>

                        <div className="flex items-end gap-2 h-56">
                            {dailyData.map(day => (
                                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group min-w-0">
                                    <div
                                        className="w-full bg-primary/20 rounded-t-sm relative group-hover:bg-primary/40 transition-colors"
                                        style={{ height: `${(day.total_plays / maxPlays) * 100}%` }}
                                    >
                                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-black/85 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 text-center">
                                            {day.total_plays} plays<br />{day.total_tours} starts
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 truncate w-full text-center">
                                        {new Date(day.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                    </span>
                                </div>
                            ))}

                            {dailyData.length === 0 && (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    Không có dữ liệu trong giai đoạn này
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#2c1e16] rounded-xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-white font-bold">Hiệu suất theo tour</h3>
                        <p className="text-sm text-gray-400">Đo lường số phiên, lượt phát, bỏ qua và thời lượng thực tế của từng tour</p>
                    </div>
                    <span className="text-xs text-gray-400">{tourData.length} tour</span>
                </div>

                <div className="px-6 py-5 border-b border-white/5 bg-black/10">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h4 className="text-white font-semibold">Biểu đồ completion rate</h4>
                            <p className="text-sm text-gray-400">Tỷ lệ hoàn tất = số lần kết thúc tour / số lần bắt đầu tour</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {tourData.map(tour => (
                            <div key={`${tour.id}-completion`} className="space-y-2">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium text-white truncate">{tour.name_vi}</span>
                                    <span className="text-primary font-semibold">{tour.completion_rate}%</span>
                                </div>
                                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                                        style={{ width: `${Math.max(4, tour.completion_rate)}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        {tourData.length === 0 && (
                            <p className="text-sm text-gray-500">Chưa có dữ liệu completion rate.</p>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-black/10 text-left text-xs uppercase tracking-wide text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Tour</th>
                                <th className="px-6 py-3">Phiên</th>
                                <th className="px-6 py-3">Lượt phát</th>
                                <th className="px-6 py-3">Auto / Manual</th>
                                <th className="px-6 py-3">Bỏ qua</th>
                                <th className="px-6 py-3">Hoàn tất</th>
                                <th className="px-6 py-3">Completion</th>
                                <th className="px-6 py-3">TG trung bình</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tourData.map(tour => (
                                <tr key={tour.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 min-w-[260px]">
                                            <div className="relative h-14 w-20 rounded-lg overflow-hidden bg-black/20 shrink-0">
                                                {tour.cover_image_url ? (
                                                    <Image
                                                        src={tour.cover_image_url}
                                                        alt={tour.name_vi}
                                                        fill
                                                        unoptimized
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-[#1a1512] text-primary/50">
                                                        <span className="material-symbols-outlined">route</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-white">{tour.name_vi}</p>
                                                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tour.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>
                                                        {tour.is_active ? 'Đang mở' : 'Đang ẩn'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">{tour.poi_count} POI{typeof tour.estimated_duration_min === 'number' ? ` · ${tour.estimated_duration_min} phút` : ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-white font-semibold">{tour.sessions}</td>
                                    <td className="px-6 py-4 text-white font-semibold">{tour.total_plays}</td>
                                    <td className="px-6 py-4 text-gray-300">{tour.auto_plays} / {tour.manual_plays}</td>
                                    <td className="px-6 py-4 text-gray-300">{tour.skips}</td>
                                    <td className="px-6 py-4 text-gray-300">{tour.completed_tours}</td>
                                    <td className="px-6 py-4 text-primary font-semibold">{tour.completion_rate}%</td>
                                    <td className="px-6 py-4 text-gray-300">{tour.avg_duration_min ? `${tour.avg_duration_min} phút` : '-'}</td>
                                </tr>
                            ))}

                            {tourData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        Chưa có dữ liệu analytics theo tour.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
